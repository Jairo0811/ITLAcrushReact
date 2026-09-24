import {
  OAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from './firebase'

const TERMS_VERSION = '2026-09-23'

const firebaseErrorMessages = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo electrónico no es válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/popup-closed-by-user': 'El inicio de sesión con Microsoft fue cancelado.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Microsoft. Habilita las ventanas emergentes e inténtalo de nuevo.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese correo usando otro método de acceso.',
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

async function writeProfile(user, { displayName, authProvider, acceptTerms = false } = {}) {
  const { db } = requireFirebase()
  const reference = doc(db, 'users', user.uid)
  const snapshot = await getDoc(reference)
  const existing = snapshot.exists() ? snapshot.data() : null
  const name = (displayName || user.displayName || user.email?.split('@')[0] || 'Estudiante').trim()

  if (existing) {
    await setDoc(reference, {
      displayName: existing.displayName || name,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    return
  }

  await setDoc(reference, {
    uid: user.uid,
    displayName: name,
    email: user.email || '',
    role: 'student',
    status: 'active',
    authProvider,
    termsVersion: acceptTerms ? TERMS_VERSION : null,
    termsAcceptedAt: acceptTerms ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function registerUser({ displayName, email, password, acceptTerms }) {
  const name = displayName.trim()
  const normalizedEmail = email.trim().toLowerCase()

  if (name.length < 2) throw new Error('El nombre visible debe tener al menos 2 caracteres.')
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
  if (!acceptTerms) throw new Error('Debes aceptar los Términos de Uso y las Normas de la Comunidad.')

  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)

  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
  await updateProfile(credential.user, { displayName: name })
  await writeProfile(credential.user, { displayName: name, authProvider: 'password', acceptTerms: true })

  return credential.user
}

export async function loginUser({ email, password }) {
  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
  return credential.user
}

export async function loginWithMicrosoft({ acceptTerms = false } = {}) {
  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)

  const provider = new OAuthProvider('microsoft.com')
  provider.setCustomParameters({ prompt: 'select_account' })

  const credential = await signInWithPopup(auth, provider)
  await writeProfile(credential.user, {
    authProvider: 'microsoft.com',
    acceptTerms,
  })

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
