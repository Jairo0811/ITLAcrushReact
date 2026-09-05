import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import App from './App.jsx'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import './App.css'

function BrandLogo() {
  return (
    <div className="brand-logo" aria-label="ITLA Crush">
      <span className="brand-logo__itla">ITLA</span>
      <span className="brand-logo__crush">CRUSH <span aria-hidden="true">♥</span></span>
      <small>CONFIESA. CONECTA. COMPARTE.</small>
    </div>
  )
}

function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { user, login, register, error, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  if (user) return <Navigate to="/app" replace />

  const submit = async (event) => {
    event.preventDefault()
    setLocalError('')
    setSubmitting(true)

    try {
      if (isLogin) {
        await login({ email, password })
      } else {
        await register({ displayName, email, password })
      }
      navigate(location.state?.from || '/app', { replace: true })
    } catch (submitError) {
      setLocalError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page page-shell">
      <div className="auth-ambient auth-ambient--one" />
      <div className="auth-ambient auth-ambient--two" />
      <section className="auth-card glass-card">
        <Link to="/"><BrandLogo /></Link>
        <p className="auth-kicker">Las historias también viven aquí. ♡</p>
        <h1>{isLogin ? 'Vuelve a conectar' : 'Crea tu espacio'}</h1>
        <p>{isLogin ? 'Entra a tu comunidad y continúa descubriendo historias.' : 'Únete para confesar, conectar y compartir con control sobre tu identidad.'}</p>

        {!isConfigured && (
          <div className="auth-message auth-message--warning" role="alert">
            Firebase todavía no tiene credenciales locales. Copia <code>.env.example</code> a <code>.env</code> y completa las variables del proyecto.
          </div>
        )}

        {(localError || error) && <div className="auth-message auth-message--error" role="alert">{localError || error}</div>}

        <form onSubmit={submit}>
          {!isLogin && (
            <label>
              Nombre visible
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tu nombre" autoComplete="name" required minLength="2" />
            </label>
          )}
          <label>
            Correo electrónico
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="nombre@correo.com" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength="8" />
          </label>
          {isLogin && <Link className="auth-forgot" to="/recuperar">¿Olvidaste tu contraseña?</Link>}
          <button className="button button--primary auth-submit" disabled={submitting || !isConfigured}>
            {submitting ? 'Conectando…' : isLogin ? 'Iniciar sesión →' : 'Crear cuenta →'}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <Link to={isLogin ? '/registro' : '/login'}>{isLogin ? 'Regístrate' : 'Inicia sesión'}</Link>
        </div>
        <small className="auth-note">Firebase Authentication + sesión persistente local.</small>
      </section>
    </div>
  )
}

function PasswordResetPage() {
  const { sendPasswordReset, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      await sendPasswordReset(email)
      setMessage('Si existe una cuenta con ese correo, Firebase enviará las instrucciones de recuperación.')
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page page-shell">
      <section className="auth-card glass-card">
        <Link to="/"><BrandLogo /></Link>
        <p className="auth-kicker">Recupera tu conexión. ♡</p>
        <h1>Restablecer contraseña</h1>
        <p>Escribe el correo asociado a tu cuenta y recibirás un enlace para crear una contraseña nueva.</p>
        {message && <div className="auth-message auth-message--success" role="status">{message}</div>}
        {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="nombre@correo.com" /></label>
          <button className="button button--primary auth-submit" disabled={!isConfigured || submitting}>{submitting ? 'Enviando…' : 'Enviar enlace →'}</button>
        </form>
        <div className="auth-switch"><Link to="/login">← Volver a iniciar sesión</Link></div>
      </section>
    </div>
  )
}

function ProfilePage() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  const name = profile?.displayName || user?.displayName || 'Estudiante ITLA'

  return (
    <div className="auth-page page-shell">
      <section className="auth-card profile-card glass-card">
        <Link to="/app"><BrandLogo /></Link>
        <div className="profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <p className="auth-kicker">Tu espacio en ITLA Crush</p>
        <h1>{name}</h1>
        <p>{profile?.email || user?.email}</p>
        <div className="profile-meta">
          <span><strong>Rol</strong>{profile?.role || 'student'}</span>
          <span><strong>Estado</strong>{profile?.status || 'active'}</span>
        </div>
        <div className="profile-actions">
          <Link className="button button--soft" to="/app">Volver al feed</Link>
          <button className="button button--primary" onClick={handleLogout} disabled={signingOut}>{signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>
        </div>
      </section>
    </div>
  )
}

export default function IdentityShell() {
  const location = useLocation()

  if (location.pathname === '/login') return <AuthPage mode="login" />
  if (location.pathname === '/registro') return <AuthPage mode="register" />
  if (location.pathname === '/recuperar') return <PasswordResetPage />
  if (location.pathname === '/perfil') return <ProtectedRoute><ProfilePage /></ProtectedRoute>

  if (location.pathname === '/app' || location.pathname === '/crear') {
    return <ProtectedRoute><App /></ProtectedRoute>
  }

  return <App />
}
