import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { requireFirebase } from './firebase'

const MAX_CONFESSION_LENGTH = 500
const MAX_RECIPIENT_LENGTH = 80
const MAX_TAGS = 6

function normalizeTags(text) {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) ?? []
  return [...new Set(matches.map((tag) => tag.slice(0, 40)))].slice(0, MAX_TAGS)
}

function mapConfession(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.() ?? null,
  }
}

export function subscribePublicConfessions(callback, onError) {
  const { db } = requireFirebase()
  const feedQuery = query(
    collection(db, 'confessions'),
    where('visibility', '==', 'public'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(50),
  )

  return onSnapshot(
    feedQuery,
    (snapshot) => callback(snapshot.docs.map(mapConfession)),
    onError,
  )
}

export async function createConfession({
  user,
  profile,
  recipientText,
  message,
  visibility = 'public',
  isAnonymous = true,
}) {
  if (!user) throw new Error('Debes iniciar sesión para publicar.')

  const text = message.trim()
  const recipient = recipientText.trim()

  if (!text) throw new Error('Escribe una confesión antes de publicar.')
  if (text.length > MAX_CONFESSION_LENGTH) throw new Error('La confesión supera el límite de 500 caracteres.')
  if (recipient.length > MAX_RECIPIENT_LENGTH) throw new Error('El destinatario supera el límite permitido.')
  if (!['public', 'private'].includes(visibility)) throw new Error('La visibilidad seleccionada no es válida.')

  const { db } = requireFirebase()
  const confessionRef = doc(collection(db, 'confessions'))
  const ownerRef = doc(db, 'confessionAuthors', confessionRef.id)
  const batch = writeBatch(db)

  batch.set(confessionRef, {
    recipientText: recipient,
    text,
    visibility,
    isAnonymous,
    authorDisplayName: isAnonymous ? '' : (profile?.displayName || user.displayName || 'Estudiante'),
    authorBadge: 'Estudiante',
    tags: normalizeTags(text),
    status: 'active',
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  batch.set(ownerRef, {
    authorUid: user.uid,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  return confessionRef.id
}

export async function deleteOwnConfession(confessionId) {
  const { db } = requireFirebase()
  const batch = writeBatch(db)
  batch.update(doc(db, 'confessions', confessionId), {
    status: 'deleted',
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export { MAX_CONFESSION_LENGTH }
