import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { Icon, SkipLink } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ITLA_PROGRAMS, getProgram } from '../data/itlaPrograms.js'
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN } from '../data/profileRules.js'
import { useSocialPreferences } from '../hooks/useSocialPreferences.js'
import { updateOwnProfile } from '../services/authService.js'
import { subscribeMyConfessions } from '../services/confessionService.js'

const ROLE_LABELS = { student: 'Estudiante', moderator: 'Moderador', admin: 'Administrador' }
const STATUS_LABELS = { active: 'Activa', suspended: 'Suspendida', blocked: 'Bloqueada' }

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  return value.toDate?.() ?? null
}

export default function ProfilePage() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const uid = user?.uid
  const { likedIds, savedIds } = useSocialPreferences(uid)
  const [confessionCount, setConfessionCount] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [programDraft, setProgramDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (!uid) return undefined
    return subscribeMyConfessions(
      uid,
      (items) => setConfessionCount(items.length),
      (countError) => console.error('No se pudieron contar tus confesiones.', countError),
    )
  }, [uid])

  const name = profile?.displayName || user?.displayName || 'Estudiante ITLA'
  const programInfo = getProgram(profile?.program)
  const createdAt = toDate(profile?.createdAt)
  const memberSince = createdAt ? new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(createdAt) : ''
  const role = profile?.role || 'student'
  const isStaff = role === 'moderator' || role === 'admin'

  const startEditing = () => {
    setNameDraft(profile?.displayName || user?.displayName || '')
    setProgramDraft(profile?.program || '')
    setFormError('')
    setSavedMessage('')
    setEditing(true)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setFormError('')
    try {
      await updateOwnProfile(uid, { displayName: nameDraft, program: programDraft })
      setEditing(false)
      setSavedMessage('Perfil actualizado.')
    } catch (saveError) {
      console.error('No se pudo actualizar el perfil.', saveError)
      setFormError(saveError.code === 'permission-denied'
        ? 'No tienes permiso para editar este perfil.'
        : saveError.message || 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/home', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  const stats = [
    { to: '/mis-confesiones', label: 'Confesiones', value: confessionCount, icon: 'pen-to-square' },
    { to: '/guardados', label: 'Guardados', value: savedIds.size, icon: 'bookmark' },
    { to: '/favoritos', label: 'Favoritos', value: likedIds.size, icon: 'heart' },
  ]

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main profile-page" tabIndex="-1">
        <section className="profile-hero glass-card">
          <div className="profile-hero__cover" aria-hidden="true" style={{ '--program-color': programInfo?.color }} />
          <div className="profile-hero__body">
            <div className="profile-avatar profile-avatar--large" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
            <div className="profile-hero__identity">
              <h1>{name}</h1>
              {programInfo && <span className="program-badge" style={{ '--program-color': programInfo.color }}>{programInfo.label}</span>}
              {memberSince && <p className="profile-hero__meta">Miembro desde {memberSince}</p>}
            </div>
            {!editing && (
              <button type="button" className="button button--soft" onClick={startEditing}>
                <Icon name="pen" /> Editar perfil
              </button>
            )}
          </div>

          {savedMessage && !editing && <div className="auth-message auth-message--success" role="status">{savedMessage}</div>}

          {editing && (
            <form className="profile-edit" onSubmit={saveProfile}>
              <label>
                Nombre visible
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  minLength={DISPLAY_NAME_MIN}
                  maxLength={DISPLAY_NAME_MAX}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Tecnólogo
                <select value={programDraft} onChange={(event) => setProgramDraft(event.target.value)} required>
                  {ITLA_PROGRAMS.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}
                </select>
              </label>
              <p className="profile-edit__hint">Las confesiones que ya publicaste con tu nombre conservan el nombre con el que se publicaron.</p>
              {formError && <div className="auth-message auth-message--error" role="alert">{formError}</div>}
              <div className="profile-edit__actions">
                <button type="button" className="button button--soft" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="button button--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </form>
          )}
        </section>

        <section className="profile-stats" aria-label="Tu actividad">
          {stats.map((stat) => (
            <Link key={stat.to} to={stat.to} className="stat-tile glass-card">
              <Icon name={stat.icon} />
              <strong>{stat.value ?? '–'}</strong>{' '}
              <span>{stat.label}</span>
            </Link>
          ))}
        </section>

        <section className="glass-card profile-section">
          <h2>Tu cuenta</h2>
          <dl className="profile-details">
            <div><dt>Correo</dt><dd>{profile?.email || user?.email}<small>Solo tú puedes verlo.</small></dd></div>
            {isStaff && <div><dt>Rol</dt><dd>{ROLE_LABELS[role]}</dd></div>}
            {profile?.status && profile.status !== 'active' && <div><dt>Estado</dt><dd>{STATUS_LABELS[profile.status] || profile.status}</dd></div>}
          </dl>
        </section>

        {isStaff && (
          <section className="glass-card profile-section">
            <h2>Herramientas</h2>
            <div className="profile-links">
              <Link to="/moderacion"><Icon name="flag" /> Cola de moderación</Link>
              {role === 'admin' && <Link to="/admin"><Icon name="gauge-high" /> Administración</Link>}
            </div>
          </section>
        )}

        <section className="glass-card profile-section">
          <h2>Ayuda y seguridad</h2>
          <div className="profile-links">
            <Link to="/normas"><Icon name="people-group" /> Normas de la comunidad</Link>
            <Link to="/privacidad"><Icon name="user-shield" /> Privacidad</Link>
            <Link to="/terminos"><Icon name="file-lines" /> Términos de uso</Link>
          </div>
        </section>

        <div className="profile-logout">
          <button type="button" className="button button--soft" onClick={handleLogout} disabled={signingOut}>
            <Icon name="right-from-bracket" /> {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}
