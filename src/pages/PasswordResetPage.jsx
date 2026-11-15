import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { BrandLogo, SkipLink } from '../components/ui.jsx'

export default function PasswordResetPage() {
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
      setMessage('Si existe una cuenta con ese correo, recibirás las instrucciones de recuperación.')
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="auth-page page-shell" tabIndex="-1">
      <SkipLink />
      <section className="auth-card glass-card">
        <Link to="/home"><BrandLogo /></Link>
        <p className="auth-kicker">Recupera tu conexión. ♡</p>
        <h1>Restablecer contraseña</h1>
        <p>Escribe el correo asociado a tu cuenta y recibirás un enlace para crear una contraseña nueva.</p>
        {message && <div className="auth-message auth-message--success" role="status">{message}</div>}
        {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="tu.correo@itla.edu.do" /></label>
          <button className="button button--primary auth-submit" disabled={!isConfigured || submitting}>{submitting ? 'Enviando…' : 'Enviar enlace →'}</button>
        </form>
        <div className="auth-switch"><Link to="/login">← Volver a iniciar sesión</Link></div>
      </section>
    </main>
  )
}
