import {
  collection,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { requireFirebase } from './firebase'

async function countCollection(path, ...constraints) {
  const { db } = requireFirebase()
  const source = constraints.length
    ? query(collection(db, path), ...constraints)
    : collection(db, path)
  const snapshot = await getCountFromServer(source)
  return snapshot.data().count
}

export async function loadAdminMetrics() {
  const [
    usersTotal,
    usersActive,
    admins,
    moderators,
    confessionsTotal,
    confessionsPublic,
    confessionsPrivate,
    confessionsAnonymous,
    confessionsActive,
    confessionsReview,
    confessionsRemoved,
    reportsTotal,
    reportsOpen,
    reportsReviewing,
    reportsResolved,
    reportsDismissed,
    moderationCases,
  ] = await Promise.all([
    countCollection('users'),
    countCollection('users', where('status', '==', 'active')),
    countCollection('users', where('role', '==', 'admin')),
    countCollection('users', where('role', '==', 'moderator')),
    countCollection('confessions'),
    countCollection('confessions', where('visibility', '==', 'public')),
    countCollection('confessions', where('visibility', '==', 'private')),
    countCollection('confessions', where('isAnonymous', '==', true)),
    countCollection('confessions', where('status', '==', 'active')),
    countCollection('confessions', where('status', '==', 'under_review')),
    countCollection('confessions', where('status', '==', 'removed')),
    countCollection('reports'),
    countCollection('reports', where('status', '==', 'open')),
    countCollection('reports', where('status', '==', 'reviewing')),
    countCollection('reports', where('status', '==', 'resolved')),
    countCollection('reports', where('status', '==', 'dismissed')),
    countCollection('moderationCases'),
  ])

  return {
    users: {
      total: usersTotal,
      active: usersActive,
      restricted: Math.max(0, usersTotal - usersActive),
      admins,
      moderators,
    },
    confessions: {
      total: confessionsTotal,
      public: confessionsPublic,
      private: confessionsPrivate,
      anonymous: confessionsAnonymous,
      active: confessionsActive,
      underReview: confessionsReview,
      removed: confessionsRemoved,
    },
    reports: {
      total: reportsTotal,
      open: reportsOpen,
      reviewing: reportsReviewing,
      resolved: reportsResolved,
      dismissed: reportsDismissed,
    },
    moderationCases,
  }
}

function mapTimestamp(data, field) {
  return data[field]?.toDate?.() ?? null
}

export function subscribeRecentUsers(callback, onError) {
  const { db } = requireFirebase()
  const usersQuery = query(
    collection(db, 'users'),
    orderBy('createdAt', 'desc'),
    limit(8),
  )

  return onSnapshot(
    usersQuery,
    (snapshot) => callback(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        ...data,
        createdAt: mapTimestamp(data, 'createdAt'),
        updatedAt: mapTimestamp(data, 'updatedAt'),
      }
    })),
    onError,
  )
}

export function subscribeRecentConfessions(callback, onError) {
  const { db } = requireFirebase()
  const confessionsQuery = query(
    collection(db, 'confessions'),
    orderBy('createdAt', 'desc'),
    limit(8),
  )

  return onSnapshot(
    confessionsQuery,
    (snapshot) => callback(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        ...data,
        createdAt: mapTimestamp(data, 'createdAt'),
        updatedAt: mapTimestamp(data, 'updatedAt'),
      }
    })),
    onError,
  )
}

export function subscribeRecentReports(callback, onError) {
  const { db } = requireFirebase()
  const reportsQuery = query(
    collection(db, 'reports'),
    orderBy('createdAt', 'desc'),
    limit(8),
  )

  return onSnapshot(
    reportsQuery,
    (snapshot) => callback(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        ...data,
        createdAt: mapTimestamp(data, 'createdAt'),
        updatedAt: mapTimestamp(data, 'updatedAt'),
      }
    })),
    onError,
  )
}
