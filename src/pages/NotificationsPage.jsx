import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { Icon, SkipLink } from '../components/ui.jsx'
import { loadSocialNotifications } from '../services/socialService.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Carga puntual al abrir, al pulsar "Actualizar" y al volver a la pestaña; sin listeners permanentes.
  useEffect(() => {
    if (!user) return undefined
    let active = true

    loadSocialNotifications(user.uid)
      .then((nextItems) => {
        if (!active) return
        setItems(nextItems)
        setError('')
      })
      .catch((notificationError) => {
        console.error('No se pudieron cargar las notificaciones.', notificationError)
        if (active) setError('No pudimos cargar tus notificaciones.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => { active = false }
  }, [user, reloadKey])

  useEffect(() => {
    const reloadWhenVisible = () => {
      if (document.visibilityState === 'visible') setReloadKey((key) => key + 1)
    }
    document.addEventListener('visibilitychange', reloadWhenVisible)
    return () => document.removeEventListener('visibilitychange', reloadWhenVisible)
  }, [])

  const refresh = () => {
    setRefreshing(true)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Notificaciones</h1>
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">ACTIVIDAD SOCIAL</p><h2>Tus <span>notificaciones ♡</span></h2><p>Reacciones y comentarios recibidos en tus confesiones públicas.</p></div>
          <button type="button" className="button button--soft" onClick={refresh} disabled={refreshing}>
            <Icon name="rotate" /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </section>

        <section className="glass-card notifications-card">
          {loading && <div className="empty-state" role="status">Sincronizando actividad…</div>}
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="empty-state">Todavía no tienes actividad social nueva.</div>}
          {items.map((item) => (
            <Link className="notification-row" to={`/app?confession=${item.confessionId}`} key={`${item.kind}-${item.id}`}>
              <span className="notification-icon"><Icon name={item.kind === 'reaction' ? 'heart' : 'comment'} /></span>
              <div>
                <strong>{item.actorDisplayName || 'Alguien'} {item.kind === 'reaction' ? 'reaccionó a tu confesión' : 'comentó tu confesión'}</strong>
                <p>{item.kind === 'comment' ? item.text : item.confessionLabel}</p>
                <small>{formatRelativeTime(item.createdAt)}</small>
              </div>
              <Icon name="chevron-right" />
            </Link>
          ))}
        </section>
      </main>
      <AppMobileNav />
    </div>
  )
}
