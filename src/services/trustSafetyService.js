import {
  collection,
  doc,
  getDoc,
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

export const REPORT_REASONS = [
  { value: 'harassment', label: 'Acoso o intimidación' },
  { value: 'hate', label: 'Discurso de odio o discriminación' },
  { value: 'sexual', label: 'Contenido sexual inapropiado' },
  { value: 'violence', label: 'Amenazas o violencia' },
  { value: 'privacy', label: 'Privacidad o datos personales' },
  { value: 'spam', label: 'Spam o contenido engañoso' },
  { value: 'other', label: 'Otro motivo' },
]

const REPORT_REASON_VALUES = REPORT_REASONS.map((reason) => reason.value)

export async function reportConfession({ confessionId, reporterUid, reason, details = '' }) {
  if (!confessionId || !reporterUid) throw new Error('No pudimos identificar la publicación o tu cuenta.')
  if (!REPORT_REASON_VALUES.includes(reason)) throw new Error('Selecciona un motivo válido.')

  const normalizedDetails = details.trim()
  if (normalizedDetails.length > 500) throw new Error('Los detalles no pueden superar 500 caracteres.')

  const { db } = requireFirebase()
  const reportId = `${confessionId}_${reporterUid}`

  await setDoc(doc(db, 'reports', reportId), {
    confessionId,
    reporterUid,
    reason,
    details: normalizedDetails,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function hideConfession({ confessionId, ownerUid }) {
  if (!confessionId || !ownerUid) return

  const { db } = requireFirebase()
  await setDoc(doc(db, 'hiddenConfessions', `${ownerUid}_${confessionId}`), {
    ownerUid,
    confessionId,
    createdAt: serverTimestamp(),
  })
}

export function subscribeHiddenConfessionIds(ownerUid, callback, onError) {
  const { db } = requireFirebase()
  const hiddenQuery = query(
    collection(db, 'hiddenConfessions'),
    where('ownerUid', '==', ownerUid),
    limit(200),
  )

  return onSnapshot(
    hiddenQuery,
    (snapshot) => callback(new Set(snapshot.docs.map((item) => item.data().confessionId))),
    onError,
  )
}

export function subscribeModerationReports(callback, onError) {
  const { db } = requireFirebase()
  const reportsQuery = query(
    collection(db, 'reports'),
    orderBy('createdAt', 'desc'),
    limit(100),
  )

  return onSnapshot(
    reportsQuery,
    async (snapshot) => {
      try {
        const reports = await Promise.all(snapshot.docs.map(async (item) => {
          const data = item.data()
          const confessionSnapshot = await getDoc(doc(db, 'confessions', data.confessionId))
          return {
            id: item.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() ?? null,
            updatedAt: data.updatedAt?.toDate?.() ?? null,
            confession: confessionSnapshot.exists()
              ? { id: confessionSnapshot.id, ...confessionSnapshot.data() }
              : null,
          }
        }))
        callback(reports)
      } catch (readError) {
        onError?.(readError)
      }
    },
    onError,
  )
}

export async function updateReportStatus(reportId, status) {
  if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
    throw new Error('Estado de reporte no válido.')
  }

  const { db } = requireFirebase()
  await updateDoc(doc(db, 'reports', reportId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function moderateConfession({ confessionId, moderatorUid, action, note = '' }) {
  if (!['active', 'under_review', 'removed'].includes(action)) {
    throw new Error('Acción de moderación no válida.')
  }

  const normalizedNote = note.trim()
  if (normalizedNote.length > 500) throw new Error('La nota de moderación no puede superar 500 caracteres.')

  const { db } = requireFirebase()
  const batch = writeBatch(db)
  batch.update(doc(db, 'confessions', confessionId), {
    status: action,
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(db, 'moderationCases', confessionId), {
    confessionId,
    lastAction: action,
    note: normalizedNote,
    moderatedBy: moderatorUid,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
  await batch.commit()
}
