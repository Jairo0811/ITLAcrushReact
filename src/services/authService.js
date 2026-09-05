import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from './firebase'

const firebaseErrorMessages = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo electrónico no es válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/too-many-requests': 'Demasiados intentos. Inténtalo de nuevo más tarde.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
}

export function getAuthErrorMessage(error) {
  if (error?.code && firebaseErrorMessages[error.code]) return firebaseErrorMessages[error.code]
  if (error?.message) return error.message
  return 'No pudimos completar la operación. Inténtalo nuevamente.'
}

export async function registerUser({ displayName, email, password }) {
  const name = displayName.trim()
  const normalizedEmail = email.trim().toLowerCase()

  if (name.length < 2) throw new Error('El nombre visible debe tener al menos 2 caracteres.')
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')

  const { auth, db } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)

  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
  await updateProfile(credential.user, { displayName: name })

  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    displayName: name,
    email: normalizedEmail,
    role: 'student',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return credential.user
}

export async function loginUser({ email, password }) {
  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
  return credential.user
}

export async function logoutUser() {
  const { auth } = requireFirebase()
  await signOut(auth)
}

export async function resetPassword(email) {
  const { auth } = requireFirebase()
  await sendPasswordResetEmail(auth, email.trim().toLowerCase())
}

export function observeAuth(callback) {
  const { auth } = requireFirebase()
  return onAuthStateChanged(auth, callback)
}

export async function getUserProfile(uid) {
  const { db } = requireFirebase()
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}
