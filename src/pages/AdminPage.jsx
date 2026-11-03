import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getProgram } from '../data/itlaPrograms.js'
import { REPORT_REASONS, REPORT_STATUS_LABELS } from '../services/trustSafetyService.js'
import { ACCOUNT_STATUSES, ADMIN_ROLES, loadAdminMetrics, subscribeAdminAuditLogs, subscribeAdminUsers, subscribeRecentConfessions, subscribeRecentReports, updateUserAccess } from '../services/adminService.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { Icon, SkipLink } from '../components/ui.jsx'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'

const emptyAdminMetrics = {
  users: { total: 0, active: 0, restricted: 0, admins: 0, moderators: 0 },
  confessions: { total: 0, public: 0, private: 0, anonymous: 0, active: 0, underReview: 0, removed: 0 },
  reports: { total: 0, open: 0, reviewing: 0, resolved: 0, dismissed: 0 },
  moderationCases: 0,
}

function AdminMetricCard({ icon, label, value, detail, tone = 'default' }) {
  return (
    <article className={`glass-card admin-metric admin-metric--${tone}`}>
      <div className="admin-metric__icon"><Icon name={icon} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  )
}

export default function AdminPage() {
  const { user, profile } = useAuth()
  const [metrics, setMetrics] = useState(emptyAdminMetrics)
  const [managedUsers, setManagedUsers] = useState([])
  const [recentConfessions, setRecentConfessions] = useState([])
  const [recentReports, setRecentReports] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [userDrafts, setUserDrafts] = useState({})
  const [savingUid, setSavingUid] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const refreshMetrics = useCallback(async () => {
    setRefreshing(true)
    try {
      const nextMetrics = await loadAdminMetrics()
      setMetrics(nextMetrics)
      setError('')
    } catch (adminError) {
      console.error('No se pudieron cargar las métricas administrativas.', adminError)
      setError('No pudimos cargar las métricas administrativas. Verifica que las reglas de Firestore para administradores estén desplegadas.')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    loadAdminMetrics()
      .then((nextMetrics) => {
        if (!active) return
        setMetrics(nextMetrics)
        setError('')
      })
      .catch((adminError) => {
        console.error('No se pudieron cargar las métricas administrativas.', adminError)
        if (!active) return
        setError('No pudimos cargar las métricas administrativas. Verifica que las reglas de Firestore para administradores estén desplegadas.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const subscriptions = [
      subscribeAdminUsers(
        (nextUsers) => {
          setManagedUsers(nextUsers)
          setUserDrafts(Object.fromEntries(nextUsers.map((item) => [
            item.id,
            {
              role: item.role || 'student',
              status: item.status || 'active',
            },
          ])))
        },
        (readError) => {
          console.error('No se pudieron cargar los usuarios para administración.', readError)
          setError('La gestión de usuarios requiere las reglas administrativas actualizadas.')
        },
      ),
      subscribeRecentConfessions(
        setRecentConfessions,
        (readError) => {
          console.error('No se pudieron cargar las confesiones recientes.', readError)
          setError('No pudimos cargar la actividad reciente de confesiones.')
        },
      ),
      subscribeRecentReports(
        setRecentReports,
        (readError) => {
          console.error('No se pudieron cargar los reportes recientes.', readError)
          setError('No pudimos cargar la actividad reciente de reportes.')
        },
      ),
      subscribeAdminAuditLogs(
        setAuditLogs,
        (readError) => {
          console.error('No se pudo cargar la bitácora administrativa.', readError)
          setError('No pudimos cargar la bitácora administrativa.')
        },
      ),
    ]

    return () => subscriptions.forEach((unsubscribe) => unsubscribe?.())
  }, [])

  const confessionStatusLabel = (value) => ({ active: 'Activa', under_review: 'En revisión', removed: 'Retirada', deleted: 'Eliminada' }[value] || value)
  const visibilityLabel = (value) => ({ public: 'Pública', private: 'Privada' }[value] || value)
  const reportReason = (value) => REPORT_REASONS.find((item) => item.value === value)?.label || value
  const roleLabel = (value) => ({ student: 'Estudiante', moderator: 'Moderador', admin: 'Administrador' }[value] || value)
  const statusLabel = (value) => ({ active: 'Activa', suspended: 'Suspendida', blocked: 'Bloqueada' }[value] || value)
  const auditActionLabel = (value) => ({
    role_changed: 'Cambio de rol',
    status_changed: 'Cambio de estado',
    access_changed: 'Cambio de acceso',
  }[value] || value)

  const updateDraft = (uid, field, value) => {
    setUserDrafts((current) => ({
      ...current,
      [uid]: {
        ...(current[uid] || {}),
        [field]: value,
      },
    }))
  }

  const saveUserAccess = async (targetUser) => {
    const draft = userDrafts[targetUser.id]
    if (!draft || savingUid) return

    setSavingUid(targetUser.id)
    setActionMessage('')
    setError('')

    try {
      await updateUserAccess({
        actorUid: user.uid,
        targetUser,
        nextRole: draft.role,
        nextStatus: draft.status,
      })
      setActionMessage(`Acceso actualizado para ${targetUser.displayName || targetUser.email || 'el usuario'} y registrado en la bitácora.`)
      await refreshMetrics()
    } catch (adminError) {
      setError(adminError.message || 'No pudimos actualizar el acceso de esa cuenta.')
    } finally {
      setSavingUid('')
    }
  }

  return (
    <div className="app-layout page-shell admin-page">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <header className="admin-heading glass-card">
          <div>
            <p className="eyebrow">CENTRO DE ADMINISTRACIÓN</p>
            <h1>Monitoreo y control de <span>ITLA Crush</span></h1>
            <p>Supervisa actividad, seguridad y acceso de cuentas desde un entorno separado de la experiencia normal de usuario.</p>
          </div>
          <div className="admin-heading__actions">
            <span className="admin-role-chip"><Icon name="shield-halved" /> {profile?.role || 'admin'}</span>
            <button className="button button--primary" onClick={refreshMetrics} disabled={refreshing}>
              <Icon name="rotate" /> {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </header>

        {error && <div className="auth-message auth-message--error admin-alert" role="alert">{error}</div>}
        {actionMessage && <div className="auth-message auth-message--success admin-alert" role="status">{actionMessage}</div>}

        <section className="admin-metrics" aria-label="Métricas principales">
          <AdminMetricCard icon="users" label="Usuarios" value={loading ? '…' : metrics.users.total} detail={`${metrics.users.active} activos · ${metrics.users.restricted} restringidos`} />
          <AdminMetricCard icon="comments" label="Confesiones" value={loading ? '…' : metrics.confessions.total} detail={`${metrics.confessions.public} públicas · ${metrics.confessions.private} privadas`} />
          <AdminMetricCard icon="user-secret" label="Anónimas" value={loading ? '…' : metrics.confessions.anonymous} detail="Identidad pública oculta" />
          <AdminMetricCard icon="triangle-exclamation" label="Reportes abiertos" value={loading ? '…' : metrics.reports.open} detail={`${metrics.reports.reviewing} en revisión`} tone={metrics.reports.open > 0 ? 'warning' : 'default'} />
          <AdminMetricCard icon="shield" label="Casos moderados" value={loading ? '…' : metrics.moderationCases} detail={`${metrics.confessions.removed} contenidos retirados`} />
          <AdminMetricCard icon="user-shield" label="Equipo interno" value={loading ? '…' : metrics.users.admins + metrics.users.moderators} detail={`${metrics.users.admins} admin · ${metrics.users.moderators} moderadores`} />
        </section>

        <section className="admin-health-grid">
          <article className="glass-card admin-health-card">
            <div className="rail-title"><h2><Icon name="heart-pulse" /> Estado operativo</h2></div>
            <div className="admin-health-row">
              <span>Lectura de datos</span>
              <b className={error ? '' : 'status-ok'}><Icon name={error ? 'triangle-exclamation' : 'circle-check'} /> {loading ? 'Cargando…' : error ? 'Con errores' : 'Correcta'}</b>
            </div>
            <div className="admin-health-row"><span>Feed activo</span><b>{metrics.confessions.active}</b></div>
            <div className="admin-health-row"><span>En revisión</span><b>{metrics.confessions.underReview}</b></div>
            <div className="admin-health-row"><span>Reportes resueltos</span><b>{metrics.reports.resolved}</b></div>
          </article>

          <article className="glass-card admin-health-card">
            <div className="rail-title"><h2><Icon name="scale-balanced" /> Privacidad y control</h2></div>
            <p>La administración de cuentas no revela automáticamente la identidad interna detrás de confesiones anónimas. Cada cambio de rol o estado queda registrado en una bitácora inmutable.</p>
            <div className="admin-health-row"><span>Contenido anónimo</span><b>{metrics.confessions.anonymous}</b></div>
            <div className="admin-health-row"><span>Cuentas restringidas</span><b>{metrics.users.restricted}</b></div>
            <div className="admin-health-row"><span>Eventos auditados</span><b>{auditLogs.length}</b></div>
          </article>
        </section>

        <section className="glass-card admin-table-card admin-account-manager">
          <div className="admin-section-heading">
            <div><p className="eyebrow">CONTROL DE ACCESO</p><h2>Gestión de cuentas</h2></div>
            <span>{managedUsers.length} usuarios cargados</span>
          </div>
          <p className="admin-section-note">Puedes cambiar roles y suspender, bloquear o reactivar cuentas. Tu propia cuenta administrativa está protegida contra cambios desde este panel.</p>

          <div className="admin-user-list" role="table" aria-label="Gestión de cuentas">
            {managedUsers.length === 0 && <div className="admin-empty">No hay cuentas disponibles para gestionar.</div>}
            {managedUsers.map((item) => {
              const program = getProgram(item.program)
              const draft = userDrafts[item.id] || { role: item.role || 'student', status: item.status || 'active' }
              const isSelf = item.id === user.uid
              const changed = draft.role !== (item.role || 'student') || draft.status !== (item.status || 'active')

              return (
                <div className="admin-user-row" role="row" key={item.id}>
                  <div className="admin-user-identity">
                    <strong>{item.displayName || 'Sin nombre'} {isSelf && <small className="admin-self-badge">Tu cuenta</small>}</strong>
                    <small>{item.email || 'Sin correo'} · {program?.label || item.program || 'Sin tecnólogo'}</small>
                  </div>

                  <label>
                    <span>Rol</span>
                    <select
                      value={draft.role}
                      onChange={(event) => updateDraft(item.id, 'role', event.target.value)}
                      disabled={isSelf || savingUid === item.id}
                    >
                      {ADMIN_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Estado</span>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(item.id, 'status', event.target.value)}
                      disabled={isSelf || savingUid === item.id}
                    >
                      {ACCOUNT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                  </label>

                  <button
                    className="button button--primary admin-save-access"
                    onClick={() => saveUserAccess(item)}
                    disabled={isSelf || !changed || savingUid === item.id}
                  >
                    <Icon name="floppy-disk" /> {savingUid === item.id ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-monitor-grid">
          <article className="glass-card admin-table-card">
            <div className="admin-section-heading"><div><p className="eyebrow">CONTENIDO</p><h2>Confesiones recientes</h2></div><Link to="/moderacion">Abrir moderación →</Link></div>
            <div className="admin-table" role="table" aria-label="Confesiones recientes">
              {recentConfessions.length === 0 && <div className="admin-empty">Sin actividad reciente.</div>}
              {recentConfessions.map((item) => (
                <div className="admin-table-row admin-table-row--content" role="row" key={item.id}>
                  <div><strong>{item.isAnonymous ? 'Anónima' : (item.authorDisplayName || 'Identificada')}</strong><small>{item.text?.slice(0, 95) || 'Sin contenido'}{item.text?.length > 95 ? '…' : ''}</small></div>
                  <span>{visibilityLabel(item.visibility)}</span>
                  <span className={`admin-status admin-status--${item.status}`}>{confessionStatusLabel(item.status)}</span>
                  <small>{formatRelativeTime(item.createdAt)}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-card admin-table-card">
            <div className="admin-section-heading"><div><p className="eyebrow">TRUST & SAFETY</p><h2>Reportes recientes</h2></div><Link to="/moderacion">Gestionar cola →</Link></div>
            <div className="admin-table" role="table" aria-label="Reportes recientes">
              {recentReports.length === 0 && <div className="admin-empty">No hay reportes recientes.</div>}
              {recentReports.map((item) => (
                <div className="admin-table-row" role="row" key={item.id}>
                  <div><strong>{reportReason(item.reason)}</strong><small>Confesión {item.confessionId}</small></div>
                  <span className={`moderation-status moderation-status--${item.status}`}>{REPORT_STATUS_LABELS[item.status] || item.status}</span>
                  <span>{item.details ? 'Con detalle' : 'Sin detalle'}</span>
                  <small>{formatRelativeTime(item.createdAt)}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-card admin-table-card admin-table-card--wide">
            <div className="admin-section-heading"><div><p className="eyebrow">AUDITORÍA</p><h2>Bitácora administrativa</h2></div><span>Últimos {auditLogs.length}</span></div>
            <div className="admin-table admin-audit-table" role="table" aria-label="Bitácora administrativa">
              {auditLogs.length === 0 && <div className="admin-empty">Todavía no hay cambios administrativos registrados.</div>}
              {auditLogs.map((item) => (
                <div className="admin-table-row admin-table-row--audit" role="row" key={item.id}>
                  <div>
                    <strong>{auditActionLabel(item.action)}</strong>
                    <small>{item.targetEmail || item.targetUid}</small>
                  </div>
                  <span>{roleLabel(item.previousRole)} → {roleLabel(item.newRole)}</span>
                  <span>{statusLabel(item.previousStatus)} → {statusLabel(item.newStatus)}</span>
                  <small>{formatRelativeTime(item.createdAt)}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
      <AppMobileNav />
    </div>
  )
}
