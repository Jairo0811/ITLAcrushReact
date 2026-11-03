import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getProgram, ITLA_PROGRAMS } from '../data/itlaPrograms.js'
import { BrandLogo, SkipLink } from '../components/ui.jsx'

function MicrosoftMark() {
  return <span aria-hidden="true"><i /><i /><i /><i /></span>
}

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { user, login, loginMicrosoft, register, error, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [program, setProgram] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  if (user) return <Navigate to="/app" replace />

  const finishAuth = () => navigate(location.state?.from || '/app', { replace: true })

  const submit = async (event) => {
    event.preventDefault()
    setLocalError('')

    if (!isLogin && !acceptedTerms) {
      setLocalError('Debes aceptar los Términos de Uso y las Normas de la Comunidad.')
      return
    }

    setSubmitting(true)
    try {
      if (isLogin) {
        await login({ email, password })
      } else {
        await register({ displayName, email, password, program, acceptTerms: acceptedTerms })
      }
      finishAuth()
    } catch (submitError) {
      setLocalError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const microsoftSignIn = async () => {
    setLocalError('')
    if (!isLogin && !program) {
      setLocalError('Selecciona tu tecnólogo antes de continuar con Microsoft.')
      return
    }
    if (!isLogin && !acceptedTerms) {
      setLocalError('Para registrarte con Microsoft, confirma que aceptas los Términos de Uso y las Normas de la Comunidad.')
      return
    }

    setSubmitting(true)
    try {
      await loginMicrosoft({
        acceptTerms: !isLogin,
        program: isLogin ? '' : program,
        loginHint: email,
      })
      finishAuth()
    } catch (submitError) {
      setLocalError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="auth-page page-shell" tabIndex="-1">
      <SkipLink />
      <div className="auth-ambient auth-ambient--one" />
      <div className="auth-ambient auth-ambient--two" />
      <section className="auth-card glass-card">
        <Link to="/home"><BrandLogo /></Link>
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
            <>
              <label>
                Nombre visible
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tu nombre" autoComplete="name" required minLength="2" />
              </label>
              <label>
                Tecnólogo
                <select value={program} onChange={(event) => setProgram(event.target.value)} required>
                  <option value="">Selecciona tu carrera</option>
                  {ITLA_PROGRAMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              {program && (() => {
                const selectedProgram = getProgram(program)
                return <div className="program-preview program-badge" style={{ '--program-color': selectedProgram?.color }}>{selectedProgram?.label}</div>
              })()}
            </>
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
          {!isLogin && (
            <label className="terms-check">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
              <span>He leído y acepto los <Link to="/terminos">Términos de Uso</Link>, la <Link to="/privacidad">Política de Privacidad</Link> y las <Link to="/normas">Normas de la Comunidad</Link>.</span>
            </label>
          )}
          <button className="button button--primary auth-submit" disabled={submitting || !isConfigured || (!isLogin && !acceptedTerms)}>
            {submitting ? 'Conectando…' : isLogin ? 'Iniciar sesión →' : 'Crear cuenta →'}
          </button>
        </form>

        <div className="auth-divider">o continúa con</div>

        <button type="button" className="button microsoft-button" onClick={microsoftSignIn} disabled={submitting || !isConfigured || (!isLogin && (!acceptedTerms || !program))}>
          <MicrosoftMark /> Continuar con Microsoft
        </button>
        <p className="microsoft-access-note">
          Acceso institucional: solo cuentas <strong>@itla.edu.do</strong>. La autorización final depende de las políticas de Microsoft Entra del ITLA.
        </p>

        <div className="auth-switch">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <Link to={isLogin ? '/registro' : '/login'}>{isLogin ? 'Regístrate' : 'Inicia sesión'}</Link>
        </div>

        <div className="auth-legal-links">
          <Link to="/terminos">Términos</Link>
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/normas">Normas de la Comunidad</Link>
        </div>
        <small className="auth-note">Tu identidad puede ocultarse ante la comunidad, pero no ante los controles internos de seguridad y moderación.</small>
      </section>
    </main>
  )
}
