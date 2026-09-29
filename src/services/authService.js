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
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { ITLA_PROGRAM_VALUES } from '../data/itlaPrograms.js'
import { requireFirebase } from './firebase'

const TERMS_VERSION = '2026-09-23'
export const ITLA_EMAIL_DOMAIN = 'itla.edu.do'
const MICROSOFT_TENANT = import.meta.env?.VITE_MICROSOFT_TENANT || ITLA_EMAIL_DOMAIN

const firebaseErrorMessages = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo electrónico no es válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/popup-closed-by-user': 'El inicio de sesión con Microsoft fue cancelado.',
  'auth/user-cancelled': 'Microsoft no pudo completar el acceso. Si el ITLA requiere aprobación administrativa para ITLA Crush, espera a que la solicitud sea aprobada e inténtalo nuevamente.',
  'auth/non-itla-microsoft-account': 'El acceso con Microsoft está reservado para cuentas institucionales @itla.edu.do.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Microsoft. Habilita las ventanas emergentes e inténtalo de nuevo.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.',
  'auth/operation-not-allowed': 'Este método de inicio de sesión todavía no está habilitado en Firebase Authentication.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese correo usando otro método de acceso.',
  'auth/too-many-requests': 'Demasiados intentos. Inténtalo de nuevo más tarde.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
}

export function isItlaEmail(email = '') {
  const normalized = String(email).trim().toLowerCase()
  if (!normalized.endsWith(`@${ITLA_EMAIL_DOMAIN}`)) return false
  return normalized.length > ITLA_EMAIL_DOMAIN.length + 1
}

function isMicrosoftUser(user) {
  return user?.providerData?.some((provider) => provider.providerId === 'microsoft.com') ?? false
}

function createAuthError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function assertAllowedMicrosoftUser(user) {
  if (!isItlaEmail(user?.email)) {
    throw createAuthError(
      'auth/non-itla-microsoft-account',
      'El acceso con Microsoft está reservado para cuentas institucionales @itla.edu.do.',
    )
  }
}

export function getAuthErrorMessage(error) {
  if (error?.code && firebaseErrorMessages[error.code]) return firebaseErrorMessages[error.code]
  if (error?.message) return error.message
  return 'No pudimos completar la operación. Inténtalo nuevamente.'
}

async function writeProfile(user, { displayName, program, authProvider, acceptTerms = false } = {}) {
  const { db } = requireFirebase()
  const reference = doc(db, 'users', user.uid)
  const snapshot = await getDoc(reference)
  const existing = snapshot.exists() ? snapshot.data() : null
  const name = (displayName || user.displayName || user.email?.split('@')[0] || 'Estudiante').trim()

  if (existing) {
    const profileUpdate = {
      displayName: existing.displayName || name,
      updatedAt: serverTimestamp(),
    }
    if (!existing.program && ITLA_PROGRAM_VALUES.includes(program)) profileUpdate.program = program
    await setDoc(reference, profileUpdate, { merge: true })
    return
  }

  if (!ITLA_PROGRAM_VALUES.includes(program)) {
    throw new Error('Selecciona el tecnólogo al que perteneces para completar tu perfil.')
  }

  await setDoc(reference, {
    uid: user.uid,
    displayName: name,
    email: user.email || '',
    program,
    role: 'student',
    status: 'active',
    authProvider,
    termsVersion: acceptTerms ? TERMS_VERSION : null,
    termsAcceptedAt: acceptTerms ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function registerUser({ displayName, email, password, program, acceptTerms }) {
  const name = displayName.trim()
  const normalizedEmail = email.trim().toLowerCase()

  if (name.length < 2) throw new Error('El nombre visible debe tener al menos 2 caracteres.')
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
  if (!ITLA_PROGRAM_VALUES.includes(program)) throw new Error('Selecciona tu tecnólogo.')
  if (!acceptTerms) throw new Error('Debes aceptar los Términos de Uso y las Normas de la Comunidad.')

  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)

  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
  await updateProfile(credential.user, { displayName: name })
  await writeProfile(credential.user, { displayName: name, program, authProvider: 'password', acceptTerms: true })

  return credential.user
}

export async function loginUser({ email, password }) {
  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
  return credential.user
}

export async function loginWithMicrosoft({
  acceptTerms = false,
  program = '',
  loginHint = '',
} = {}) {
  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)

  const provider = new OAuthProvider('microsoft.com')
  const customParameters = {
    prompt: 'select_account',
    tenant: MICROSOFT_TENANT,
  }

  if (isItlaEmail(loginHint)) {
    customParameters.login_hint = loginHint.trim().toLowerCase()
  }

  provider.setCustomParameters(customParameters)

  const credential = await signInWithPopup(auth, provider)
  try {
    assertAllowedMicrosoftUser(credential.user)
    await writeProfile(credential.user, {
      program,
      authProvider: 'microsoft.com',
      acceptTerms,
    })
  } catch (profileError) {
    await signOut(auth)
    throw profileError
  }

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

  return onAuthStateChanged(auth, async (user) => {
    if (user && isMicrosoftUser(user) && !isItlaEmail(user.email)) {
      await signOut(auth)
      return
    }

    callback(user)
  })
}

export async function getUserProfile(uid) {
  const { db } = requireFirebase()
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}


export function observeUserProfile(uid, callback, onError) {
  const { db } = requireFirebase()
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}
