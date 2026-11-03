import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getProgram } from '../data/itlaPrograms.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import { BrandLogo, SkipLink } from '../components/ui.jsx'

const ROLE_LABELS = { student: 'Estudiante', moderator: 'Moderador', admin: 'Administrador' }
const STATUS_LABELS = { active: 'Activa', suspended: 'Suspendida', blocked: 'Bloqueada' }

export default function ProfilePage() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/home', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  const name = profile?.displayName || user?.displayName || 'Estudiante ITLA'
  const programInfo = getProgram(profile?.program)

  return (
    <main id="main-content" className="auth-page page-shell" tabIndex="-1">
      <SkipLink />
      <section className="auth-card profile-card glass-card">
        <Link to="/app"><BrandLogo /></Link>
        <div className="profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <p className="auth-kicker">Tu espacio en ITLA Crush</p>
        <h1>{name}</h1>
        <p>{profile?.email || user?.email}</p>
        {programInfo && <div className="program-badge profile-program" style={{ '--program-color': programInfo.color }}>{programInfo.label}</div>}
        <div className="profile-meta">
          <span><strong>Rol</strong>{ROLE_LABELS[profile?.role] || 'Estudiante'}</span>
          <span><strong>Estado</strong>{STATUS_LABELS[profile?.status] || 'Activa'}</span>
        </div>
        <div className="profile-actions">
          <Link className="button button--soft" to="/app">Volver al feed</Link>
          <Link className="button button--soft" to="/mis-confesiones">Mis confesiones</Link>
          <Link className="button button--soft" to="/guardados">Guardados</Link>
          <Link className="button button--soft" to="/favoritos">Favoritos</Link>
          <button className="button button--primary" onClick={handleLogout} disabled={signingOut}>{signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>
        </div>
      </section>
      <AppMobileNav />
    </main>
  )
}
