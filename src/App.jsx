import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { getProgram } from './data/itlaPrograms.js'
import { createConfession, deleteOwnConfession, subscribeMyConfessions, subscribePublicConfessions } from './services/confessionService.js'
import { REPORT_REASONS, hideConfession, moderateConfession, reportConfession, subscribeHiddenConfessionIds, subscribeModerationReports, updateReportStatus } from './services/trustSafetyService.js'
import { isFirebaseConfigured } from './services/firebase.js'
import './App.css'

const trends = [
  ['#AmorITLA', 'Explora conversaciones de la comunidad'],
  ['#VidaITLA', 'Historias del día a día'],
  ['#Biblioteca', 'Momentos entre clases'],
  ['#CrushSecreto', 'Confesiones anónimas'],
  ['#IngenieríaDelAmor', 'Cuando el código también conecta'],
]

function formatRelativeTime(date) {
  if (!date) return 'ahora'
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

function usePublicConfessions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState(
    isFirebaseConfigured ? '' : 'Firebase no está configurado en este equipo. Revisa tu archivo .env.',
  )

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    const unsubscribe = subscribePublicConfessions(
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (snapshotError) => {
        console.error('No se pudo cargar el feed de confesiones.', snapshotError)
        setError('No pudimos cargar las confesiones en este momento.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { items, loading, error }
}

function BrandLogo({ compact = false }) {
  return (
    <div className={`brand-logo ${compact ? 'brand-logo--compact' : ''}`}>
      <img
        className="brand-logo__image"
        src="/itla-crush-logo.png"
        alt="ITLA Crush"
      />
      {!compact && <small>CONFIESA. CONECTA. COMPARTE.</small>}
    </div>
  )
}

function Icon({ name, regular = false, className = '' }) {
  return <i className={`${regular ? 'fa-regular' : 'fa-solid'} fa-${name} icon ${className}`.trim()} aria-hidden="true" />
}

function PublicConfessionCard({ item, onDelete, onHide, onReport }) {
  const author = item.isAnonymous ? 'Anónimo' : (item.authorDisplayName || 'Estudiante')
  const tags = item.tags ?? []
  const programInfo = item.isAnonymous ? null : getProgram(item.authorProgram)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('harassment')
  const [details, setDetails] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [safetyMessage, setSafetyMessage] = useState('')

  const submitReport = async (event) => {
    event.preventDefault()
    if (!onReport || sendingReport) return
    setSendingReport(true)
    setSafetyMessage('')
    try {
      await onReport(item.id, reason, details)
      setSafetyMessage('Reporte enviado. La publicación se ocultó de tu feed.')
      setReportOpen(false)
      setDetails('')
    } catch (reportError) {
      setSafetyMessage(reportError.message || 'No pudimos enviar el reporte.')
    } finally {
      setSendingReport(false)
    }
  }

  return (
    <article className="confession-card glass-card">
      <div className="confession-card__header">
        <div className={`avatar ${item.isAnonymous ? 'avatar--anonymous' : ''}`}>{item.isAnonymous ? '◉' : author.charAt(0).toUpperCase()}</div>
        <div>
          <strong>{author}</strong>
          <div className="muted-row">{programInfo ? <span className="tiny-badge program-badge" style={{ '--program-color': programInfo.color }}>{programInfo.label}</span> : <span className="tiny-badge">Estudiante</span>}<span>{formatRelativeTime(item.createdAt)}</span></div>
        </div>
        {onReport ? <button className="icon-button" aria-label="Opciones de seguridad" onClick={() => setReportOpen((value) => !value)}><Icon name="ellipsis" /></button> : <span />}
      </div>
      {item.recipientText && <small className="confession-recipient">Para: {item.recipientText}</small>}
      <p>{item.text}</p>
      {tags.length > 0 && <div className="tag-row">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      <div className="card-actions">
        <button title="Las reacciones persistentes llegan en una fase posterior"><Icon name="heart" regular /> {item.likeCount ?? 0}</button>
        <button title="Los comentarios persistentes llegan en una fase posterior"><Icon name="comment" regular /> {item.commentCount ?? 0}</button>
        <button><Icon name="share-nodes" /> Compartir</button>
        {onDelete && <button className="bookmark" onClick={() => onDelete(item.id)}><Icon name="trash-can" /> Eliminar</button>}
        {onHide && !onDelete && <button className="bookmark" onClick={() => onHide(item.id)}><Icon name="eye-slash" /> Ocultar</button>}
      </div>
      {reportOpen && onReport && (
        <form className="safety-panel" onSubmit={submitReport}>
          <strong>Reportar esta confesión</strong>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            {REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <textarea value={details} maxLength="500" onChange={(event) => setDetails(event.target.value)} placeholder="Detalles opcionales para moderación…" />
          <div className="safety-panel__actions">
            <button type="button" className="button button--soft" onClick={() => setReportOpen(false)}>Cancelar</button>
            <button className="button button--primary" disabled={sendingReport}>{sendingReport ? 'Enviando…' : 'Enviar reporte'}</button>
          </div>
        </form>
      )}
      {safetyMessage && <div className="safety-message" role="status">{safetyMessage}</div>}
    </article>
  )
}

function LandingPage() {
  const { items: publicConfessions, loading, error } = usePublicConfessions()
  const { user, profile } = useAuth()
  const displayName = profile?.displayName || user?.displayName || 'Mi cuenta'

  return (
    <div className="landing-page page-shell">
      <header className="landing-nav content-width">
        <Link to="/" className="brand-link"><BrandLogo compact /></Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#inicio">Inicio</a>
          <a href="#confesiones">Confesiones</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#comunidad">Comunidad</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <Link className="button button--ghost session-profile-link" to="/perfil" title={displayName}><Icon name="circle-user" /> Mi perfil</Link>
              <Link className="button button--primary" to="/app"><Icon name="arrow-right" /> Ir al feed</Link>
            </>
          ) : (
            <>
              <Link className="button button--ghost" to="/login"><Icon name="right-to-bracket" /> Iniciar sesión</Link>
              <Link className="button button--primary" to="/registro"><Icon name="user-plus" /> Regístrate</Link>
            </>
          )}
        </div>
      </header>

      <main id="inicio" className="landing-main content-width">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">CONFIESA. CONECTA. <span>COMPARTE.</span></p>
            <h1>Las confesiones también crean <span>conexiones</span></h1>
            <p className="hero-description">Un espacio moderno para decir lo que sientes, descubrir historias de tu comunidad y conectar sin perder el control de tu privacidad.</p>
            <div className="hero-actions">
              {user ? (
                <>
                  <Link className="button button--primary button--large" to="/app"><Icon name="arrow-right" /> Ir a mi feed</Link>
                  <Link className="button button--soft button--large" to="/perfil"><Icon name="user" /> Mi perfil</Link>
                </>
              ) : (
                <>
                  <Link className="button button--primary button--large" to="/registro">Únete ahora <Icon name="arrow-right" /></Link>
                  <Link className="button button--soft button--large" to="/app"><Icon name="eye" /> Ver demo</Link>
                </>
              )}
            </div>
            <div className="benefit-row">
              <span><Icon name="user-secret" />Anónimo</span>
              <span><Icon name="heart" />Real</span>
              <span><Icon name="shield-halved" />Con control</span>
              <span><Icon name="users" />Comunidad</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Vista conceptual de ITLA Crush">
            <div className="neon-orb neon-orb--one" />
            <div className="neon-orb neon-orb--two" />
            <div className="hero-phone glass-card">
              <div className="phone-status"><span>9:41</span><span>● ● ●</span></div>
              <BrandLogo />
              <div className="phone-search">⌕ Buscar confesiones…</div>
              <div className="phone-card"><strong>#Amor</strong><p>Me encanta verte en clase, aunque nunca hablamos… algún día tal vez. 👀💕</p><small>♥ 324 &nbsp; ◌ 67</small></div>
              <div className="phone-card"><strong>#ITLA</strong><p>ITLA no solo forma profesionales, también junta historias increíbles. ✨</p><small>♥ 198 &nbsp; ◌ 41</small></div>
              <div className="phone-bottom">⌂ &nbsp; ⌕ &nbsp; <b>＋</b> &nbsp; ♡ &nbsp; ◯</div>
            </div>
            <div className="hero-message hero-message--left">Buenas personas.<br/>Grandes historias. ♡</div>
            <div className="hero-message hero-message--right">Confiesa.<br/>Conecta.<br/>Comparte. ♡</div>
          </div>
        </section>

        <section className="stats-panel glass-card" id="comunidad">
          <div><strong>+10K</strong><span>Confesiones compartidas</span></div>
          <div><strong>+5K</strong><span>Conexiones reales</span></div>
          <div><strong>Privacidad</strong><span>Anonimato público con trazabilidad interna</span></div>
          <div className="stats-panel__highlight"><strong>La comunidad que se atreve ♡</strong></div>
        </section>

        <section id="confesiones" className="landing-feed">
          <div className="section-heading">
            <div><p className="eyebrow">HISTORIAS REALES</p><h2>Confesiones públicas</h2><p>Sentimientos, amistades y momentos que forman parte de la vida ITLA.</p></div>
            <Link to="/app">Ver todas →</Link>
          </div>
          <div className="landing-card-grid">
            {loading && <div className="glass-card empty-state">Cargando confesiones…</div>}
            {!loading && error && <div className="glass-card empty-state">{error}</div>}
            {!loading && !error && publicConfessions.length === 0 && <div className="glass-card empty-state">Todavía no hay confesiones públicas. Sé la primera persona en compartir una.</div>}
            {publicConfessions.slice(0, 3).map((item) => <PublicConfessionCard item={item} key={item.id} />)}
          </div>
        </section>

        <section id="como-funciona" className="how-section">
          <div className="section-heading"><div><p className="eyebrow">SIMPLE Y DIRECTO</p><h2>Cómo funciona</h2></div></div>
          <div className="steps-grid">
            <div className="glass-card"><span>01</span><h3>Crea tu cuenta</h3><p>Construye tu perfil y entra a la comunidad.</p></div>
            <div className="glass-card"><span>02</span><h3>Elige cómo expresarte</h3><p>Publica de forma identificada o anónima y define la visibilidad.</p></div>
            <div className="glass-card"><span>03</span><h3>Conecta con respeto</h3><p>Descubre historias, reacciona y mantén el control de tu experiencia.</p></div>
          </div>
        </section>
      </main>
    </div>
  )
}

function AppSidebar() {
  const { profile } = useAuth()
  const items = [
    ['/', 'house', 'Inicio'],
    ['/app', 'magnifying-glass', 'Explorar'],
    ['/mis-confesiones', 'clock-rotate-left', 'Mis Confesiones'],
    ['/app', 'paper-plane', 'Mensajes'],
    ['/app', 'bell', 'Notificaciones'],
    ['/app', 'bookmark', 'Guardados'],
    ['/app', 'heart', 'Favoritos'],
    ['/perfil', 'circle-user', 'Mi Perfil'],
    ...(profile?.role === 'moderator' || profile?.role === 'admin' ? [['/moderacion', 'flag', 'Moderación']] : []),
  ]
  return (
    <aside className="app-sidebar">
      <Link to="/"><BrandLogo /></Link>
      <nav>
        {items.map(([to, icon, label], index) => (
          <NavLink key={`${label}-${index}`} to={to} className={({ isActive }) => (index === 1 && isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link')}>
            <span><Icon name={icon} /></span>{label}{label === 'Mensajes' && <b>3</b>}{label === 'Notificaciones' && <b>12</b>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-quote glass-card"><Icon name="heart" regular /><p>Buenas ideas también conectan corazones.</p></div>
    </aside>
  )
}

function FeedPage() {
  const [searchText, setSearchText] = useState('')
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [safetyError, setSafetyError] = useState('')
  const { items: publicConfessions, loading, error } = usePublicConfessions()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const name = profile?.displayName || user?.displayName || 'Estudiante'
  const initial = name.charAt(0).toUpperCase()

  useEffect(() => {
    if (!user) return undefined
    return subscribeHiddenConfessionIds(
      user.uid,
      setHiddenIds,
      (hiddenError) => console.error('No se pudieron cargar las publicaciones ocultas.', hiddenError),
    )
  }, [user])

  const visibleConfessions = useMemo(() => {
    const normalized = searchText.trim().toLowerCase()
    const available = publicConfessions.filter((item) => !hiddenIds.has(item.id))
    if (!normalized) return available
    return available.filter((item) => `${item.text} ${item.recipientText || ''} ${(item.tags ?? []).join(' ')}`.toLowerCase().includes(normalized))
  }, [hiddenIds, publicConfessions, searchText])

  const handleHide = async (confessionId) => {
    setSafetyError('')
    try {
      await hideConfession({ confessionId, ownerUid: user.uid })
      setHiddenIds((current) => new Set([...current, confessionId]))
    } catch (hideError) {
      setSafetyError(hideError.message || 'No pudimos ocultar esa publicación.')
    }
  }

  const handleReport = async (confessionId, reason, details) => {
    setSafetyError('')
    await reportConfession({ confessionId, reporterUid: user.uid, reason, details })
    await hideConfession({ confessionId, ownerUid: user.uid })
    setHiddenIds((current) => new Set([...current, confessionId]))
  }

  return (
    <div className="app-layout page-shell">
      <AppSidebar />
      <main className="app-main">
        <header className="app-topbar glass-card">
          <label className="app-search"><span><Icon name="magnifying-glass" /></span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar confesiones o #hashtags…" /></label>
          <div className="topbar-actions"><button aria-label="Notificaciones"><Icon name="bell" regular /></button><button aria-label="Tema"><Icon name="sun" regular /></button><Link to="/perfil" className="mini-profile"><div className="avatar">{initial}</div><span><strong>{name}</strong><small>Cuenta autenticada ♥</small></span></Link></div>
        </header>

        <section className="dashboard-grid">
          <div className="feed-column">
            <section className="dashboard-hero glass-card">
              <div><p className="eyebrow">CONFIESA. CONECTA. COMPARTE.</p><h2>Aquí también nacen <span>grandes historias ♡</span></h2></div>
              <div className="dashboard-hero__note">Más que una U,<br/>conexiones reales ♡</div>
            </section>

            <section className="quick-compose glass-card" onClick={() => navigate('/crear')} role="button" tabIndex="0">
              <div className="avatar">{initial}</div><span>¿Qué quieres confesar hoy?</span><button className="button button--primary">Publicar</button>
            </section>

            <div className="feed-tabs"><button className="active">Más recientes</button><button disabled>Para ti</button><button disabled>Tendencias</button></div>
            <div className="feed-list">
              {safetyError && <div className="auth-message auth-message--error" role="alert">{safetyError}</div>}
              {loading && <div className="glass-card empty-state">Sincronizando con Firestore…</div>}
              {!loading && error && <div className="glass-card empty-state">{error}</div>}
              {!loading && !error && visibleConfessions.length === 0 && <div className="glass-card empty-state">No encontramos confesiones públicas con esa búsqueda.</div>}
              {visibleConfessions.map((item) => <PublicConfessionCard item={item} key={item.id} onHide={handleHide} onReport={handleReport} />)}
            </div>
          </div>

          <aside className="right-rail">
            <section className="glass-card rail-card"><div className="rail-title"><h3>🔥 Temas de la comunidad</h3></div>{trends.map(([tag, description], index) => <div className="trend-row" key={tag}><b>{index + 1}</b><span><strong>{tag}</strong><small>{description}</small></span></div>)}</section>
            <section className="glass-card rail-card"><div className="rail-title"><h3>Acciones rápidas</h3></div><div className="quick-grid"><Link to="/crear"><Icon name="heart" /><span>Nueva confesión</span></Link><Link to="/perfil"><Icon name="circle-user" regular /><span>Mi perfil</span></Link><Link to="/normas"><Icon name="flag" /><span>Normas</span></Link><Link to="/crear"><Icon name="user-secret" /><span>Modo anónimo</span></Link></div></section>
          </aside>
        </section>
      </main>
      <nav className="mobile-bottom-nav"><Link to="/app"><Icon name="house" /><small>Inicio</small></Link><Link to="/app"><Icon name="magnifying-glass" /><small>Explorar</small></Link><Link className="mobile-create" to="/crear"><Icon name="plus" /><small>Crear</small></Link><Link to="/normas"><Icon name="flag" /><small>Normas</small></Link><Link to="/perfil"><Icon name="circle-user" regular /><small>Perfil</small></Link></nav>
    </div>
  )
}

function MyConfessionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    const unsubscribe = subscribeMyConfessions(
      user.uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (readError) => {
        console.error('No se pudieron cargar tus confesiones.', readError)
        setError('No pudimos cargar tus confesiones.')
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  const remove = async (confessionId) => {
    try {
      await deleteOwnConfession(confessionId)
      setItems((current) => current.filter((item) => item.id !== confessionId))
    } catch (deleteError) {
      console.error('No se pudo retirar la confesión.', deleteError)
      setError('No pudimos retirar esa confesión.')
    }
  }

  return (
    <div className="app-layout page-shell">
      <AppSidebar />
      <main className="app-main">
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TU HISTORIAL</p><h2>Mis <span>confesiones ♡</span></h2></div>
          <button className="button button--primary" onClick={() => navigate('/crear')}>Nueva confesión</button>
        </section>
        <div className="feed-list" style={{ marginTop: '16px' }}>
          {loading && <div className="glass-card empty-state">Cargando tus confesiones…</div>}
          {!loading && error && <div className="glass-card empty-state">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="glass-card empty-state">Todavía no has publicado confesiones.</div>}
          {items.map((item) => <PublicConfessionCard key={item.id} item={item} onDelete={remove} />)}
        </div>
      </main>
    </div>
  )
}

function ModerationPage() {
  const { user, profile } = useAuth()
  const canModerate = profile?.role === 'moderator' || profile?.role === 'admin'
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(canModerate)
  const [error, setError] = useState('')
  const [actionNote, setActionNote] = useState({})

  useEffect(() => {
    if (!canModerate) return undefined

    return subscribeModerationReports(
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
    )
  }, [canModerate])

  const review = async (report, confessionStatus, reportStatus) => {
    setError('')
    try {
      await moderateConfession({
        confessionId: report.confessionId,
        moderatorUid: user.uid,
        action: confessionStatus,
        note: actionNote[report.id] || '',
      })
      await updateReportStatus(report.id, reportStatus)
    } catch (moderationError) {
      setError(moderationError.message || 'No pudimos completar la acción de moderación.')
    }
  }

  if (!canModerate) {
    return <div className="not-found page-shell"><BrandLogo /><h1>403</h1><p>Esta sección está reservada para moderación autorizada.</p><Link className="button button--primary" to="/app">Volver al feed</Link></div>
  }

  return (
    <div className="app-layout page-shell">
      <AppSidebar />
      <main className="app-main">
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
                <span className={`moderation-status moderation-status--${report.status}`}>{report.status}</span>
              </div>
              <small>{formatRelativeTime(report.createdAt)} · {report.confessionId}</small>
              {report.details && <p><strong>Detalle del reporte:</strong> {report.details}</p>}
              <div className="moderation-content">
                <span>Contenido reportado</span>
                <p>{report.confession?.text || 'La confesión ya no está disponible.'}</p>
              </div>
              <textarea
                value={actionNote[report.id] || ''}
                maxLength="500"
                onChange={(event) => setActionNote((current) => ({ ...current, [report.id]: event.target.value }))}
                placeholder="Nota interna de moderación…"
              />
              <div className="moderation-actions">
                <button className="button button--soft" onClick={() => updateReportStatus(report.id, 'reviewing')}>Marcar en revisión</button>
                <button className="button button--soft" onClick={() => review(report, 'active', 'dismissed')}>Mantener</button>
                <button className="button button--primary" onClick={() => review(report, 'removed', 'resolved')}>Retirar contenido</button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}

function CreateConfessionPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [published, setPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!message.trim() || submitting) return

    setSubmitting(true)
    setError('')

    try {
      await createConfession({
        user,
        profile,
        recipientText: recipient,
        message,
        visibility: isPublic ? 'public' : 'private',
        isAnonymous,
      })
      setPublished(true)
    } catch (publishError) {
      console.error('No se pudo publicar la confesión.', publishError)
      setError(publishError.message || 'No pudimos publicar tu confesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="create-page page-shell">
      <div className="create-card glass-card">
        <button className="back-button" onClick={() => navigate('/app')}>← Volver</button>
        <BrandLogo compact />
        <div className="create-heading"><div className="send-icon"><Icon name="paper-plane" /></div><h1>Tu historia también cuenta</h1><p>Confiesa. Conecta. Comparte.</p></div>
        {published ? (
          <div className="success-panel"><span>♡</span><h2>Confesión publicada</h2><p>{isPublic ? 'Ya forma parte del feed público de ITLA Crush.' : 'Se guardó como privada y solo tu cuenta puede leerla en esta fase.'}</p><button className="button button--primary" onClick={() => navigate('/app')}>Volver al feed</button></div>
        ) : (
          <form onSubmit={submit} className="confession-form">
            {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
            <label><span>Para…</span><input value={recipient} maxLength="80" onChange={(event) => setRecipient(event.target.value)} placeholder="@usuario, carrera, grupo o alguien en ITLA" /></label>
            <label><span>Tu confesión…</span><textarea value={message} maxLength="500" onChange={(event) => setMessage(event.target.value)} placeholder="Escribe aquí tu mensaje…"/><small>{message.length}/500</small></label>
            <div className="choice-card glass-card"><div><strong>◉ Público</strong><small>Visible para la comunidad</small></div><button type="button" className={`toggle ${isPublic ? 'toggle--on' : ''}`} onClick={() => setIsPublic(true)}><span /></button><div><strong>♢ Privado</strong><small>Visible solo para tu cuenta por ahora</small></div><button type="button" className={`toggle ${!isPublic ? 'toggle--on' : ''}`} onClick={() => setIsPublic(false)}><span /></button></div>
            <div className="choice-card glass-card"><div><strong>◉ Anónimo</strong><small>Tu identidad se oculta ante otros usuarios</small></div><button type="button" className={`toggle ${isAnonymous ? 'toggle--on' : ''}`} onClick={() => setIsAnonymous(true)}><span /></button><div><strong>◯ Identificado</strong><small>Tu nombre será visible</small></div><button type="button" className={`toggle ${!isAnonymous ? 'toggle--on' : ''}`} onClick={() => setIsAnonymous(false)}><span /></button></div>
            {isAnonymous && <div className="anonymous-disclosure"><strong>🕶️ Anónimo para la comunidad, no para la plataforma.</strong>El documento público no expone tu UID. La trazabilidad se guarda por separado y solo puede consultarla tu cuenta o moderación autorizada. <Link to="/privacidad">Conoce cómo funciona.</Link></div>}
            <button className="button button--primary publish-button" disabled={!message.trim() || submitting}>{submitting ? 'Publicando…' : '↗ Publicar Confesión'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const location = useLocation()
  return (
    <div className="auth-page page-shell">
      <div className="auth-ambient auth-ambient--one" />
      <div className="auth-ambient auth-ambient--two" />
      <section className="auth-card glass-card">
        <Link to="/"><BrandLogo /></Link>
        <p className="auth-kicker">Las historias también viven aquí. ♡</p>
        <h1>{isLogin ? 'Vuelve a conectar' : 'Crea tu espacio'}</h1>
        <p>{isLogin ? 'Entra a tu comunidad y continúa descubriendo historias.' : 'Únete para confesar, conectar y compartir con control sobre tu identidad.'}</p>
        <form onSubmit={(event) => event.preventDefault()}>
          {!isLogin && <label>Nombre visible<input placeholder="Tu nombre" /></label>}
          <label>Correo electrónico<input type="email" placeholder="nombre@correo.com" /></label>
          <label>Contraseña<input type="password" placeholder="••••••••" /></label>
          <Link className="button button--primary auth-submit" to="/app">{isLogin ? 'Iniciar sesión' : 'Crear cuenta'} →</Link>
        </form>
        <div className="auth-switch">{isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'} <Link to={isLogin ? '/registro' : '/login'} state={{ from: location.pathname }}>{isLogin ? 'Regístrate' : 'Inicia sesión'}</Link></div>
        <small className="auth-note">Demo visual. Firebase Authentication se conectará en la siguiente fase.</small>
      </section>
    </div>
  )
}

function NotFound() {
  return <div className="not-found page-shell"><BrandLogo/><h1>404</h1><p>Esta historia todavía no existe.</p><Link className="button button--primary" to="/">Volver al inicio</Link></div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<FeedPage />} />
      <Route path="/crear" element={<CreateConfessionPage />} />
      <Route path="/mis-confesiones" element={<MyConfessionsPage />} />
      <Route path="/moderacion" element={<ModerationPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/registro" element={<AuthPage mode="register" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
