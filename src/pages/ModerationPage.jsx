import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { REPORT_REASONS, REPORT_STATUS_LABELS, moderateConfession, subscribeModerationReports, updateReportStatus } from '../services/trustSafetyService.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { SkipLink } from '../components/ui.jsx'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'

export default function ModerationPage() {
  // El acceso lo garantiza <ProtectedRoute allowedRoles={['admin', 'moderator']} /> en el router.
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionNote, setActionNote] = useState({})
  const [busyReportId, setBusyReportId] = useState('')

  useEffect(() => subscribeModerationReports(
    (nextReports) => {
      setReports(nextReports)
      setLoading(false)
      setError('')
    },
    (reportError) => {
      console.error('No se pudo cargar la cola de moderación.', reportError)
      setError('No pudimos cargar la cola de moderación.')
      setLoading(false)
    },
  ), [])

  // Un solo punto de entrada: evita dobles envíos y captura todos los errores.
  const runAction = async (report, action) => {
    if (busyReportId) return
    setBusyReportId(report.id)
    setError('')
    try {
      await action()
    } catch (moderationError) {
      console.error('No se pudo completar la acción de moderación.', moderationError)
      setError(moderationError.message || 'No pudimos completar la acción de moderación.')
    } finally {
      setBusyReportId('')
    }
  }

  const markReviewing = (report) => runAction(report, () => updateReportStatus(report.id, 'reviewing'))

  // Confesión, caso de moderación y reporte se actualizan en un único batch atómico.
  const review = (report, confessionStatus, reportStatus) => runAction(report, () => moderateConfession({
    confessionId: report.confessionId,
    moderatorUid: user.uid,
    action: confessionStatus,
    note: actionNote[report.id] || '',
    report: { id: report.id, status: reportStatus },
  }))

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Cola de moderación</h1>
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TRUST & SAFETY</p><h2>Cola de <span>moderación ⚑</span></h2><p>Revisa reportes sin exponer la identidad pública de autores anónimos.</p></div>
        </section>
        <div className="moderation-list">
          {loading && <div className="glass-card empty-state">Cargando reportes…</div>}
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {!loading && !error && reports.length === 0 && <div className="glass-card empty-state">No hay reportes en la cola.</div>}
          {reports.map((report) => (
            <article className="glass-card moderation-card" key={report.id}>
              <div className="moderation-card__header">
                <strong>{REPORT_REASONS.find((item) => item.value === report.reason)?.label || report.reason}</strong>
                <span className={`moderation-status moderation-status--${report.status}`}>{REPORT_STATUS_LABELS[report.status] || report.status}</span>
              </div>
              <small>{formatRelativeTime(report.createdAt)} · {report.confessionId}</small>
              {report.details && <p><strong>Detalle del reporte:</strong> {report.details}</p>}
              <div className="moderation-content">
                <span>Contenido reportado</span>
                <p>{report.confession?.text || 'La confesión ya no está disponible.'}</p>
              </div>
              <textarea
                aria-label={`Nota interna para el reporte ${report.id}`}
                value={actionNote[report.id] || ''}
                maxLength="500"
                onChange={(event) => setActionNote((current) => ({ ...current, [report.id]: event.target.value }))}
                placeholder="Nota interna de moderación…"
              />
              <div className="moderation-actions">
                <button className="button button--soft" disabled={Boolean(busyReportId)} onClick={() => markReviewing(report)}>Marcar en revisión</button>
                <button className="button button--soft" disabled={Boolean(busyReportId)} onClick={() => review(report, 'active', 'dismissed')}>Mantener</button>
                <button className="button button--primary" disabled={Boolean(busyReportId)} onClick={() => review(report, 'removed', 'resolved')}>
                  {busyReportId === report.id ? 'Procesando…' : 'Retirar contenido'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}
