import {
  collection,
  doc,
  getDoc,
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

function normalizeTags(text, topicTag = '') {
  const source = `${text} ${topicTag || ''}`
  const matches = source.match(/#[\p{L}\p{N}_]+/gu) ?? []
  const deduped = new Map()

  for (const rawTag of matches) {
    const tag = rawTag.slice(0, 40)
    const key = tag.toLocaleLowerCase('es')
    if (!deduped.has(key)) deduped.set(key, tag)
  }

  return [...deduped.values()].slice(0, MAX_TAGS)
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
  )

  return onSnapshot(
    feedQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map(mapConfession)
        .sort((left, right) => {
          const leftTime = left.createdAt?.getTime?.() ?? 0
          const rightTime = right.createdAt?.getTime?.() ?? 0
          return rightTime - leftTime
        })
        .slice(0, 50)

      callback(items)
    },
    onError,
  )
}

export function subscribeMyConfessions(uid, callback, onError) {
  const { db } = requireFirebase()
  const ownershipQuery = query(
    collection(db, 'confessionAuthors'),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  )

  return onSnapshot(
    ownershipQuery,
    async (snapshot) => {
      try {
        const confessionSnapshots = await Promise.all(
          snapshot.docs.map((ownership) => getDoc(doc(db, 'confessions', ownership.id))),
        )
        callback(
          confessionSnapshots
            .filter((confession) => confession.exists())
            .map(mapConfession)
            .filter((confession) => confession.status !== 'deleted'),
        )
      } catch (readError) {
        onError?.(readError)
      }
    },
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
  topicTag = '',
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
    authorProgram: isAnonymous ? '' : (profile?.program || ''),
    tags: normalizeTags(text, topicTag),
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
