import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { Icon, SkipLink } from '../components/ui.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { groupNotificationsByDay } from '../utils/groupNotifications.js'

export default function NotificationsPage() {
  const { items, loading, refreshing, error, loadedAt, lastSeenAt, refresh, markAllSeen } = useNotifications()
  // Lo que ya habías visto al abrir la página: permite resaltar lo nuevo aunque enseguida se marque como visto.
  const [seenOnOpen] = useState(lastSeenAt)
  const groups = useMemo(() => groupNotificationsByDay(items, loadedAt), [items, loadedAt])
  const isNew = (item) => (item.createdAt?.getTime?.() ?? 0) > seenOnOpen
  const newCount = items.filter(isNew).length

  // Tras un instante con la lista a la vista, todo se considera visto y la campana se apaga.
  useEffect(() => {
    if (loading || items.length === 0) return undefined
    const timer = window.setTimeout(markAllSeen, 1500)
    return () => window.clearTimeout(timer)
  }, [loading, items, markAllSeen])

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Notificaciones</h1>
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">ACTIVIDAD SOCIAL</p>
            <h2>Tus <span>notificaciones ♡</span></h2>
            <p>{newCount > 0 ? `Tienes ${newCount} ${newCount === 1 ? 'novedad' : 'novedades'} en tus confesiones públicas.` : 'Reacciones y comentarios recibidos en tus confesiones públicas.'}</p>
          </div>
          <div className="dashboard-hero__actions">
            <button type="button" className="button button--soft" onClick={refresh} disabled={refreshing}>
              <Icon name="rotate" /> {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </section>

        <section className="glass-card notifications-card">
          {loading && <div className="empty-state" role="status">Sincronizando actividad…</div>}
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="empty-state">Todavía no tienes actividad social nueva.</div>}
          {groups.map((group) => (
            <div className="notification-group" key={group.key}>
              <h3>{group.label}</h3>
              {group.items.map((item) => (
                <Link
                  className={isNew(item) ? 'notification-row notification-row--new' : 'notification-row'}
                  to={`/app?confession=${item.confessionId}`}
                  key={`${item.kind}-${item.id}`}
                >
                  <span className="notification-icon"><Icon name={item.kind === 'reaction' ? 'heart' : 'comment'} /></span>
                  <div>
                    <strong>
                      {item.actorDisplayName || 'Alguien'} {item.kind === 'reaction' ? 'reaccionó a tu confesión' : 'comentó tu confesión'}
                      {isNew(item) && <span className="notification-new">Nueva</span>}
                    </strong>
                    <p>{item.kind === 'comment' ? item.text : item.confessionLabel}</p>
                    <small>{formatRelativeTime(item.createdAt)}</small>
                  </div>
                  <Icon name="chevron-right" />
                </Link>
              ))}
            </div>
          ))}
        </section>
      </main>
      <AppMobileNav />
    </div>
  )
}
