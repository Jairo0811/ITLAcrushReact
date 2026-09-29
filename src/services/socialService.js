import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
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

export function subscribeConfessionSocial(confessionId, callback, onError) {
  const { db } = requireFirebase()
  const activityQuery = query(
    collection(db, 'socialActivity'),
    where('confessionId', '==', confessionId),
  )

  return onSnapshot(
    activityQuery,
    (snapshot) => {
      const activities = snapshot.docs
        .map(mapActivity)
        .filter((item) => item.status === 'active')

      callback({
        likeCount: activities.filter((item) => item.kind === 'reaction').length,
        comments: sortByCreatedDesc(activities.filter((item) => item.kind === 'comment')),
      })
    },
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
  const ownerRef = doc(db, 'reactionOwners', reactionOwnerId(confessionId, user.uid))
  const ownerSnapshot = await getDoc(ownerRef)
  const batch = writeBatch(db)

  if (ownerSnapshot.exists()) {
    const activityId = ownerSnapshot.data().activityId
    batch.delete(doc(db, 'socialActivity', activityId))
    batch.delete(ownerRef)
    await batch.commit()
    return false
  }

  const activityRef = doc(collection(db, 'socialActivity'))
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
    activityId: activityRef.id,
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

async function resolveConfessionsFromRefs(refSnapshots, callback, onError) {
  try {
    const { db } = requireFirebase()
    const resolved = await Promise.all(
      refSnapshots.map(async (reference) => {
        const data = reference.data()
        const confessionSnapshot = await getDoc(doc(db, 'confessions', data.confessionId))
        if (!confessionSnapshot.exists()) return null
        const confession = confessionSnapshot.data()
        return {
          id: confessionSnapshot.id,
          ...confession,
          createdAt: mapTimestamp(confession, 'createdAt'),
          updatedAt: mapTimestamp(confession, 'updatedAt'),
          socialSavedAt: mapTimestamp(data, 'createdAt'),
        }
      }),
    )

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

  return onSnapshot(
    savedQuery,
    (snapshot) => resolveConfessionsFromRefs(snapshot.docs, callback, onError),
    onError,
  )
}

export function subscribeFavoriteConfessions(uid, callback, onError) {
  const { db } = requireFirebase()
  const favoritesQuery = query(
    collection(db, 'reactionOwners'),
    where('ownerUid', '==', uid),
  )

  return onSnapshot(
    favoritesQuery,
    (snapshot) => resolveConfessionsFromRefs(snapshot.docs, callback, onError),
    onError,
  )
}

export function subscribeSocialNotifications(uid, callback, onError) {
  const { db } = requireFirebase()
  const ownershipQuery = query(
    collection(db, 'confessionAuthors'),
    where('authorUid', '==', uid),
  )

  let interactionUnsubscribers = []

  const clearInteractionListeners = () => {
    interactionUnsubscribers.forEach((unsubscribe) => unsubscribe())
    interactionUnsubscribers = []
  }

  const unsubscribeOwnership = onSnapshot(
    ownershipQuery,
    async (snapshot) => {
      clearInteractionListeners()

      const confessionIds = snapshot.docs.map((item) => item.id).slice(0, 30)
      if (confessionIds.length === 0) {
        callback([])
        return
      }

      const confessionLabels = new Map()
      await Promise.all(confessionIds.map(async (confessionId) => {
        const confessionSnapshot = await getDoc(doc(db, 'confessions', confessionId))
        if (!confessionSnapshot.exists()) return
        const data = confessionSnapshot.data()
        confessionLabels.set(
          confessionId,
          data.recipientText || data.text?.slice(0, 70) || 'Tu confesión',
        )
      }))

      const activityByConfession = new Map()

      const publish = () => {
        const notifications = []
        activityByConfession.forEach((items, confessionId) => {
          items.forEach((item) => {
            notifications.push({
              ...item,
              confessionLabel: confessionLabels.get(confessionId) || 'Tu confesión',
            })
          })
        })
        callback(sortByCreatedDesc(notifications).slice(0, 50))
      }

      confessionIds.forEach((confessionId) => {
        const activityQuery = query(
          collection(db, 'socialActivity'),
          where('confessionId', '==', confessionId),
        )

        const unsubscribe = onSnapshot(
          activityQuery,
          (activitySnapshot) => {
            activityByConfession.set(
              confessionId,
              activitySnapshot.docs
                .map(mapActivity)
                .filter((item) => item.status === 'active'),
            )
            publish()
          },
          onError,
        )
        interactionUnsubscribers.push(unsubscribe)
      })
    },
    onError,
  )

  return () => {
    clearInteractionListeners()
    unsubscribeOwnership()
  }
}
