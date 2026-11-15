import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { requireFirebase } from './firebase'

export const MAX_COMMENT_LENGTH = 280

function mapTimestamp(data, field) {
  return data[field]?.toDate?.() ?? null
}

function mapActivity(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: mapTimestamp(data, 'createdAt'),
    updatedAt: mapTimestamp(data, 'updatedAt'),
  }
}

function sortByCreatedDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = left.createdAt?.getTime?.() ?? 0
    const rightTime = right.createdAt?.getTime?.() ?? 0
    return rightTime - leftTime
  })
}

function reactionOwnerId(confessionId, uid) {
  return `${confessionId}_${uid}`
}

function savedId(uid, confessionId) {
  return `${uid}_${confessionId}`
}

/**
 * Contadores de una publicación mediante consultas count() (1 lectura facturable por cada
 * 1000 entradas de índice), en lugar de descargar y escuchar todos los documentos de actividad.
 * Solo usa filtros de igualdad, que Firestore resuelve con los índices de campo único.
 */
export async function getConfessionSocialCounts(confessionId) {
  const { db } = requireFirebase()
  const activity = collection(db, 'socialActivity')
  const [reactions, comments] = await Promise.all([
    getCountFromServer(query(
      activity,
      where('confessionId', '==', confessionId),
      where('kind', '==', 'reaction'),
    )),
    getCountFromServer(query(
      activity,
      where('confessionId', '==', confessionId),
      where('kind', '==', 'comment'),
      where('status', '==', 'active'),
    )),
  ])

  return {
    likeCount: reactions.data().count,
    commentCount: comments.data().count,
  }
}

/** Escucha solo los comentarios de una publicación; se usa únicamente con el panel abierto. */
export function subscribeConfessionComments(confessionId, callback, onError) {
  const { db } = requireFirebase()
  const commentsQuery = query(
    collection(db, 'socialActivity'),
    where('confessionId', '==', confessionId),
    where('kind', '==', 'comment'),
  )

  return onSnapshot(
    commentsQuery,
    (snapshot) => callback(
      sortByCreatedDesc(snapshot.docs.map(mapActivity).filter((item) => item.status === 'active')),
    ),
    onError,
  )
}

export function subscribeMyReactionIds(uid, callback, onError) {
  const { db } = requireFirebase()
  const ownerQuery = query(
    collection(db, 'reactionOwners'),
    where('ownerUid', '==', uid),
  )

  return onSnapshot(
    ownerQuery,
    (snapshot) => callback(new Set(snapshot.docs.map((item) => item.data().confessionId))),
    onError,
  )
}

export async function toggleReaction({ confessionId, user, profile }) {
  if (!user) throw new Error('Debes iniciar sesión para reaccionar.')

  const { db } = requireFirebase()
  const ownerId = reactionOwnerId(confessionId, user.uid)
  const ownerRef = doc(db, 'reactionOwners', ownerId)
  const activityRef = doc(db, 'socialActivity', ownerId)
  const ownerSnapshot = await getDoc(ownerRef)
  const batch = writeBatch(db)

  if (ownerSnapshot.exists()) {
    batch.delete(activityRef)
    batch.delete(ownerRef)
    await batch.commit()
    return false
  }

  batch.set(activityRef, {
    confessionId,
    kind: 'reaction',
    actorDisplayName: profile?.displayName || user.displayName || 'Estudiante',
    actorProgram: profile?.program || '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(ownerRef, {
    ownerUid: user.uid,
    confessionId,
    activityId: ownerId,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
  return true
}

export async function addComment({ confessionId, user, profile, text }) {
  if (!user) throw new Error('Debes iniciar sesión para comentar.')

  const normalized = text.trim()
  if (!normalized) throw new Error('Escribe un comentario antes de publicarlo.')
  if (normalized.length > MAX_COMMENT_LENGTH) {
    throw new Error(`El comentario supera el límite de ${MAX_COMMENT_LENGTH} caracteres.`)
  }

  const { db } = requireFirebase()
  const activityRef = doc(collection(db, 'socialActivity'))
  const authorRef = doc(db, 'commentAuthors', activityRef.id)
  const batch = writeBatch(db)

  batch.set(activityRef, {
    confessionId,
    kind: 'comment',
    actorDisplayName: profile?.displayName || user.displayName || 'Estudiante',
    actorProgram: profile?.program || '',
    text: normalized,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(authorRef, {
    authorUid: user.uid,
    confessionId,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  return activityRef.id
}

export async function deleteOwnComment(commentId) {
  const { db } = requireFirebase()
  await updateDoc(doc(db, 'socialActivity', commentId), {
    status: 'deleted',
    updatedAt: serverTimestamp(),
  })
}

export function subscribeSavedConfessionIds(uid, callback, onError) {
  const { db } = requireFirebase()
  const savedQuery = query(
    collection(db, 'savedConfessions'),
    where('ownerUid', '==', uid),
  )

  return onSnapshot(
    savedQuery,
    (snapshot) => callback(new Set(snapshot.docs.map((item) => item.data().confessionId))),
    onError,
  )
}

export async function toggleSaved({ uid, confessionId }) {
  if (!uid) throw new Error('Debes iniciar sesión para guardar publicaciones.')

  const { db } = requireFirebase()
  const savedRef = doc(db, 'savedConfessions', savedId(uid, confessionId))
  const snapshot = await getDoc(savedRef)

  if (snapshot.exists()) {
    await deleteDoc(savedRef)
    return false
  }

  await setDoc(savedRef, {
    ownerUid: uid,
    confessionId,
    createdAt: serverTimestamp(),
  })
  return true
}

async function resolveConfessionsFromRefs(refSnapshots, cache, callback, onError) {
  try {
    const { db } = requireFirebase()
    // Solo se leen las confesiones que esta suscripción todavía no ha resuelto.
    await Promise.all(
      refSnapshots
        .map((reference) => reference.data().confessionId)
        .filter((confessionId) => !cache.has(confessionId))
        .map(async (confessionId) => {
          const confessionSnapshot = await getDoc(doc(db, 'confessions', confessionId))
          cache.set(confessionId, confessionSnapshot.exists()
            ? {
              id: confessionSnapshot.id,
              ...confessionSnapshot.data(),
              createdAt: mapTimestamp(confessionSnapshot.data(), 'createdAt'),
              updatedAt: mapTimestamp(confessionSnapshot.data(), 'updatedAt'),
            }
            : null)
        }),
    )

    const resolved = refSnapshots.map((reference) => {
      const data = reference.data()
      const confession = cache.get(data.confessionId)
      return confession ? { ...confession, socialSavedAt: mapTimestamp(data, 'createdAt') } : null
    })

    callback(
      resolved
        .filter(Boolean)
        .filter((item) => !['deleted', 'removed'].includes(item.status))
        .sort((left, right) => {
          const leftTime = left.socialSavedAt?.getTime?.() ?? 0
          const rightTime = right.socialSavedAt?.getTime?.() ?? 0
          return rightTime - leftTime
        }),
    )
  } catch (error) {
    onError?.(error)
  }
}

export function subscribeSavedConfessions(uid, callback, onError) {
  const { db } = requireFirebase()
  const savedQuery = query(
    collection(db, 'savedConfessions'),
    where('ownerUid', '==', uid),
  )

  const cache = new Map()

  return onSnapshot(
    savedQuery,
    (snapshot) => resolveConfessionsFromRefs(snapshot.docs, cache, callback, onError),
    onError,
  )
}

export function subscribeFavoriteConfessions(uid, callback, onError) {
  const { db } = requireFirebase()
  const favoritesQuery = query(
    collection(db, 'reactionOwners'),
    where('ownerUid', '==', uid),
  )

  const cache = new Map()

  return onSnapshot(
    favoritesQuery,
    (snapshot) => resolveConfessionsFromRefs(snapshot.docs, cache, callback, onError),
    onError,
  )
}

const NOTIFICATION_CONFESSION_LIMIT = 30
const NOTIFICATION_LIMIT = 50

/**
 * Carga puntual (sin listeners permanentes) de la actividad recibida en tus confesiones más
 * recientes. La página la vuelve a ejecutar al abrirse, al recuperar el foco y con "Actualizar".
 */
export async function loadSocialNotifications(uid) {
  const { db } = requireFirebase()
  const ownership = await getDocs(query(
    collection(db, 'confessionAuthors'),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_CONFESSION_LIMIT),
  ))

  const confessionIds = ownership.docs.map((item) => item.id)
  if (confessionIds.length === 0) return []

  const activitySnapshots = await Promise.all(confessionIds.map((confessionId) => getDocs(query(
    collection(db, 'socialActivity'),
    where('confessionId', '==', confessionId),
    where('status', '==', 'active'),
  ))))

  const recent = sortByCreatedDesc(activitySnapshots.flatMap((snapshot) => snapshot.docs.map(mapActivity)))
    .slice(0, NOTIFICATION_LIMIT)

  // Solo se leen las confesiones que realmente aparecen en las notificaciones.
  const labels = new Map()
  await Promise.all([...new Set(recent.map((item) => item.confessionId))].map(async (confessionId) => {
    const confessionSnapshot = await getDoc(doc(db, 'confessions', confessionId))
    if (!confessionSnapshot.exists()) return
    const data = confessionSnapshot.data()
    labels.set(confessionId, data.recipientText || data.text?.slice(0, 70) || 'Tu confesión')
  }))

  return recent.map((item) => ({ ...item, confessionLabel: labels.get(item.confessionId) || 'Tu confesión' }))
}
