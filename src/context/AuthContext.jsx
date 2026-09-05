import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured } from '../services/firebase'
import {
  getAuthErrorMessage,
  getUserProfile,
  loginUser,
  logoutUser,
  observeAuth,
  registerUser,
  resetPassword,
} from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState('')

  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setProfile(null)
      return null
    }

    const storedProfile = await getUserProfile(firebaseUser.uid)
    const fallbackProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Estudiante',
      email: firebaseUser.email,
      role: 'student',
      status: 'active',
    }

    const nextProfile = storedProfile ?? fallbackProfile
    setProfile(nextProfile)
    return nextProfile
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return undefined
    }

    const unsubscribe = observeAuth(async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        await loadProfile(firebaseUser)
      } catch (profileError) {
        console.error('No se pudo cargar el perfil.', profileError)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [loadProfile])

  const runAuthAction = useCallback(async (action) => {
    setError('')
    try {
      return await action()
    } catch (actionError) {
      const message = getAuthErrorMessage(actionError)
      setError(message)
      throw new Error(message)
    }
  }, [])

  const register = useCallback(
    async (payload) => runAuthAction(async () => {
      const firebaseUser = await registerUser(payload)
      setUser(firebaseUser)
      await loadProfile(firebaseUser)
      return firebaseUser
    }),
    [loadProfile, runAuthAction],
  )

  const login = useCallback(
    async (payload) => runAuthAction(async () => {
      const firebaseUser = await loginUser(payload)
      setUser(firebaseUser)
      await loadProfile(firebaseUser)
      return firebaseUser
    }),
    [loadProfile, runAuthAction],
  )

  const logout = useCallback(
    async () => runAuthAction(async () => {
      await logoutUser()
      setUser(null)
      setProfile(null)
    }),
    [runAuthAction],
  )

  const sendPasswordReset = useCallback(
    (email) => runAuthAction(() => resetPassword(email)),
    [runAuthAction],
  )

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    isConfigured: isFirebaseConfigured,
    register,
    login,
    logout,
    sendPasswordReset,
    refreshProfile: () => loadProfile(user),
  }), [error, loadProfile, loading, login, logout, profile, register, sendPasswordReset, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return context
}
