import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { getProgram } from './data/itlaPrograms.js'
import { createConfession, deleteOwnConfession, subscribeMyConfessions, subscribePublicConfessions } from './services/confessionService.js'
import { REPORT_REASONS, hideConfession, moderateConfession, reportConfession, subscribeHiddenConfessionIds, subscribeModerationReports, updateReportStatus } from './services/trustSafetyService.js'
import { ACCOUNT_STATUSES, ADMIN_ROLES, loadAdminMetrics, subscribeAdminAuditLogs, subscribeAdminUsers, subscribeRecentConfessions, subscribeRecentReports, updateUserAccess } from './services/adminService.js'
import { addComment, subscribeConfessionSocial, subscribeFavoriteConfessions, subscribeMyReactionIds, subscribeSavedConfessionIds, subscribeSavedConfessions, subscribeSocialNotifications, toggleReaction, toggleSaved } from './services/socialService.js'
import { isFirebaseConfigured } from './services/firebase.js'
import './App.css'

const trends = [
  ['#AmorITLA', 'Explora conversaciones de la comunidad'],
  ['#VidaITLA', 'Historias del día a día'],
  ['#Biblioteca', 'Momentos entre clases'],
  ['#CrushSecreto', 'Confesiones anónimas'],
  ['#IngenieríaDelAmor', 'Cuando el código también conecta'],
]

const demoConfessions = [
  {
    id: 'demo-1',
    recipientText: 'Alguien de Desarrollo de Software',
    text: 'Esta es una confesión ficticia para mostrar cómo se vería una publicación real en ITLA Crush. 💻💕 #Demo',
    visibility: 'public',
    isAnonymous: true,
    authorDisplayName: '',
    authorProgram: '',
    tags: ['#Demo'],
    status: 'active',
    likeCount: 24,
    commentCount: 6,
    createdAt: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    id: 'demo-2',
    recipientText: 'Biblioteca',
    text: 'Demo visual: nos cruzamos estudiando para el parcial y todavía me acuerdo de tu sonrisa. 📚✨ #AmorITLA',
    visibility: 'public',
    isAnonymous: false,
    authorDisplayName: 'Estudiante Demo',
    authorProgram: 'desarrollo-software',
    tags: ['#AmorITLA'],
    status: 'active',
    likeCount: 18,
    commentCount: 3,
    createdAt: new Date(Date.now() - 32 * 60 * 1000),
  },
  {
    id: 'demo-3',
    recipientText: 'La comunidad',
    text: 'Todo el contenido de esta pantalla es ficticio y no se guarda en Firebase. Sirve únicamente para explorar la interfaz. #ModoDemo',
    visibility: 'public',
    isAnonymous: true,
    authorDisplayName: '',
    authorProgram: '',
    tags: ['#ModoDemo'],
    status: 'active',
    likeCount: 12,
    commentCount: 1,
    createdAt: new Date(Date.now() - 75 * 60 * 1000),
  },
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

function SkipLink() {
  return <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
}

function PublicConfessionCard({
  item,
  onDelete,
  onHide,
  onReport,
  isDemo = false,
  socialEnabled = false,
  isLiked = false,
  isSaved = false,
  onToggleLike,
  onToggleSave,
}) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const author = item.isAnonymous ? 'Anónimo' : (item.authorDisplayName || 'Estudiante')
  const tags = item.tags ?? []
  const programInfo = item.isAnonymous ? null : getProgram(item.authorProgram)
  const [reportOpen, setReportOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [reason, setReason] = useState('harassment')
  const [details, setDetails] = useState('')
  const [commentText, setCommentText] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [safetyMessage, setSafetyMessage] = useState('')
  const [socialMessage, setSocialMessage] = useState('')
  const [social, setSocial] = useState({
    likeCount: item.likeCount ?? 0,
    comments: [],
  })
  const isOwnerView = Boolean(onDelete)

  useEffect(() => {
    if (isDemo) return undefined
    return subscribeConfessionSocial(
      item.id,
      setSocial,
      (socialError) => console.error('No se pudieron sincronizar las interacciones.', socialError),
    )
  }, [isDemo, item.id])

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

  const requestAppAccess = () => {
    if (!user) {
      navigate('/login', { state: { from: `/app?confession=${item.id}` } })
      return false
    }
    if (!socialEnabled) {
      navigate(`/app?confession=${item.id}`)
      return false
    }
    return true
  }

  const submitComment = async (event) => {
    event.preventDefault()
    if (!requestAppAccess() || sendingComment || isOwnerView) return
    setSendingComment(true)
    setSocialMessage('')
    try {
      await addComment({
        confessionId: item.id,
        user,
        profile,
        text: commentText,
      })
      setCommentText('')
      setSocialMessage('Comentario publicado.')
    } catch (commentError) {
      setSocialMessage(commentError.message || 'No pudimos publicar el comentario.')
    } finally {
      setSendingComment(false)
    }
  }

  const handleLike = async () => {
    if (!requestAppAccess() || isOwnerView || !onToggleLike) return
    setSocialMessage('')
    try {
      await onToggleLike(item.id)
    } catch (reactionError) {
      setSocialMessage(reactionError.message || 'No pudimos actualizar tu reacción.')
    }
  }

  const handleSave = async () => {
    if (!requestAppAccess() || !onToggleSave) return
    setSocialMessage('')
    try {
      await onToggleSave(item.id)
    } catch (saveError) {
      setSocialMessage(saveError.message || 'No pudimos actualizar tus guardados.')
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/app?confession=${encodeURIComponent(item.id)}`
    const shareData = {
      title: 'ITLA Crush',
      text: 'Mira esta confesión en ITLA Crush.',
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setSocialMessage('Compartido desde tu dispositivo.')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setSocialMessage('Enlace copiado al portapapeles.')
      } else {
        setSocialMessage(shareUrl)
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        setSocialMessage('No pudimos compartir el enlace en este momento.')
      }
    }
  }

  return (
    <article id={`confession-${item.id}`} className="confession-card glass-card">
      <div className="confession-card__header">
        <div className={`avatar ${item.isAnonymous ? 'avatar--anonymous' : ''}`} aria-hidden="true">{item.isAnonymous ? '◉' : author.charAt(0).toUpperCase()}</div>
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
        <button
          className={isLiked ? 'social-action social-action--active' : 'social-action'}
          disabled={isDemo || isOwnerView}
          aria-pressed={isLiked}
          title={isOwnerView ? 'No puedes reaccionar a tu propia confesión' : isDemo ? 'Acción deshabilitada en la demo' : 'Reaccionar'}
          onClick={handleLike}
        >
          <Icon name="heart" regular={!isLiked} /> {social.likeCount}
        </button>
        <button
          disabled={isDemo}
          aria-expanded={commentsOpen}
          aria-controls={`comments-${item.id}`}
          onClick={() => {
            if (isDemo) return
            if (!user || !socialEnabled) {
              requestAppAccess()
              return
            }
            setCommentsOpen((value) => !value)
          }}
        >
          <Icon name="comment" regular /> {social.comments.length}
        </button>
        <button disabled={isDemo} onClick={handleShare} title={isDemo ? 'Acción deshabilitada en la demo' : 'Compartir'}>
          <Icon name="share-nodes" /> Compartir
        </button>
        {socialEnabled && !isOwnerView && (
          <button className={isSaved ? 'bookmark social-action--active' : 'bookmark'} aria-pressed={isSaved} onClick={handleSave}>
            <Icon name="bookmark" regular={!isSaved} /> {isSaved ? 'Guardado' : 'Guardar'}
          </button>
        )}
        {onDelete && <button className="bookmark" onClick={() => onDelete(item.id)}><Icon name="trash-can" /> Eliminar</button>}
        {onHide && !onDelete && <button className="bookmark" onClick={() => onHide(item.id)}><Icon name="eye-slash" /> Ocultar</button>}
      </div>

      {commentsOpen && socialEnabled && (
        <section id={`comments-${item.id}`} className="comments-panel" aria-label="Comentarios">
          <div className="comments-panel__header">
            <strong>Comentarios</strong>
            <span>{social.comments.length}</span>
          </div>
          {social.comments.length === 0 && <p className="comments-empty">Todavía no hay comentarios.</p>}
          {social.comments.slice(0, 8).map((comment) => {
            const commenterProgram = getProgram(comment.actorProgram)
            return (
              <article className="comment-row" key={comment.id}>
                <div className="avatar avatar--small" aria-hidden="true">{comment.actorDisplayName?.charAt(0)?.toUpperCase() || 'E'}</div>
                <div>
                  <strong>{comment.actorDisplayName || 'Estudiante'}</strong>
                  <div className="muted-row">
                    {commenterProgram && <span className="tiny-badge program-badge" style={{ '--program-color': commenterProgram.color }}>{commenterProgram.label}</span>}
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p>{comment.text}</p>
                </div>
              </article>
            )
          })}
          {!isOwnerView && (
            <form className="comment-form" onSubmit={submitComment}>
              <label className="sr-only" htmlFor={`comment-input-${item.id}`}>Escribe un comentario</label>
              <input
                id={`comment-input-${item.id}`}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength="280"
                placeholder="Escribe un comentario respetuoso…"
              />
              <button className="button button--primary" disabled={!commentText.trim() || sendingComment}>
                {sendingComment ? 'Enviando…' : 'Comentar'}
              </button>
            </form>
          )}
        </section>
      )}

      {reportOpen && onReport && (
        <form className="safety-panel" onSubmit={submitReport}>
          <strong>Reportar esta confesión</strong>
          <label>
            <span>Motivo del reporte</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Detalles opcionales</span>
            <textarea value={details} maxLength="500" onChange={(event) => setDetails(event.target.value)} placeholder="Añade contexto para moderación…" />
          </label>
          <div className="safety-panel__actions">
            <button type="button" className="button button--soft" onClick={() => setReportOpen(false)}>Cancelar</button>
            <button className="button button--primary" disabled={sendingReport}>{sendingReport ? 'Enviando…' : 'Enviar reporte'}</button>
          </div>
        </form>
      )}
      {safetyMessage && <div className="safety-message" role="status">{safetyMessage}</div>}
      {socialMessage && <div className="safety-message" role="status">{socialMessage}</div>}
    </article>
  )
}

function LandingPage() {
  const { items: publicConfessions, loading, error } = usePublicConfessions()
  const { user, profile, loading: authLoading } = useAuth()
  const displayName = profile?.displayName || user?.displayName || 'Mi cuenta'

  return (
    <div className="landing-page page-shell">
      <SkipLink />
      <header className="landing-nav content-width">
        <Link to="/home" className="brand-link"><BrandLogo compact /></Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#inicio">Inicio</a>
          <a href="#confesiones">Confesiones</a>
          <a href="#como-funciona">¿Cómo funciona?</a>
          <a href="#comunidad">Comunidad</a>
        </nav>
        <div className="nav-actions">
          {authLoading ? (
            <div className="session-actions-loading" aria-label="Comprobando sesión" />
          ) : user ? (
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

      <main id="main-content" className="landing-main content-width" tabIndex="-1">
        <div id="inicio" />
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">CONFIESA. CONECTA. <span>COMPARTE.</span></p>
            <h1>Las confesiones también crean <span>conexiones</span></h1>
            <p className="hero-description">Un espacio moderno para decir lo que sientes, descubrir historias de tu comunidad y conectar sin perder el control de tu privacidad.</p>
            <div className="hero-actions">
              {authLoading ? (
                <div className="session-hero-loading" aria-label="Comprobando sesión" />
              ) : user ? (
                <>
                  <Link className="button button--primary button--large" to="/app"><Icon name="arrow-right" /> Ir a mi feed</Link>
                  <Link className="button button--soft button--large" to="/perfil"><Icon name="user" /> Mi perfil</Link>
                </>
              ) : (
                <>
                  <Link className="button button--primary button--large" to="/registro">Únete ahora <Icon name="arrow-right" /></Link>
                  <Link className="button button--soft button--large" to="/demo"><Icon name="eye" /> Ver demo</Link>
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
          <div className="hero-visual" role="img" aria-label="Vista conceptual de la interfaz de ITLA Crush en un teléfono">
            <div className="neon-orb neon-orb--one" aria-hidden="true" />
            <div className="neon-orb neon-orb--two" aria-hidden="true" />
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
          <div><strong>Proyecto académico</strong><span>Reconstrucción independiente y no oficial</span></div>
          <div><strong>Demo separada</strong><span>Datos ficticios que no escriben en Firebase</span></div>
          <div><strong>App real</strong><span>Autenticación y datos reales en rutas protegidas</span></div>
          <div className="stats-panel__highlight"><strong>Privacidad + accesibilidad ♡</strong></div>
        </section>

        <section id="confesiones" className="landing-feed">
          <div className="section-heading">
            <div><p className="eyebrow">FEED PÚBLICO REAL</p><h2>Confesiones públicas</h2><p>Esta sección usa datos reales publicados en Firestore. La demo visual está separada y usa contenido ficticio.</p></div>
            <Link to={user ? '/app' : '/demo'}>{user ? 'Abrir feed real →' : 'Explorar demo →'}</Link>
          </div>
          <div className="landing-card-grid">
            {loading && <div className="glass-card empty-state">Cargando confesiones…</div>}
            {!loading && error && <div className="glass-card empty-state">{error}</div>}
            {!loading && !error && publicConfessions.length === 0 && <div className="glass-card empty-state">Todavía no hay confesiones públicas. Sé la primera persona en compartir una.</div>}
            {publicConfessions.slice(0, 3).map((item) => <PublicConfessionCard item={item} key={item.id} />)}
          </div>
        </section>

        <section id="como-funciona" className="how-section">
          <div className="section-heading"><div><p className="eyebrow">SIMPLE Y DIRECTO</p><h2>¿Cómo funciona?</h2></div></div>
          <div className="steps-grid">
            <div className="glass-card"><span>01</span><h3>Crea tu cuenta</h3><p>Construye tu perfil y entra a la comunidad.</p></div>
            <div className="glass-card"><span>02</span><h3>Elige cómo expresarte</h3><p>Publica de forma identificada o anónima y define la visibilidad.</p></div>
            <div className="glass-card"><span>03</span><h3>Conecta con respeto</h3><p>Descubre historias, reacciona y mantén el control de tu experiencia.</p></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="content-width landing-footer__content">
          <div className="landing-footer__brand">
            <BrandLogo compact />
            <div>
              <strong>Proyecto académico no oficial</strong>
              <p>
                ITLA Crush es un proyecto final académico e independiente. No es una aplicación oficial,
                producto, servicio ni canal institucional del Instituto Tecnológico de Las Américas (ITLA).
              </p>
            </div>
          </div>

          <nav className="landing-footer__links" aria-label="Información legal">
            <Link to="/terminos">Términos de uso</Link>
            <Link to="/privacidad">Privacidad</Link>
            <Link to="/normas">Normas de la comunidad</Link>
          </nav>

          <small className="landing-footer__note">
            El nombre, identidad institucional y marcas de ITLA pertenecen a sus respectivos titulares.
          </small>
        </div>
      </footer>
    </div>
  )
}

function AppSidebar() {
  const { profile } = useAuth()
  const items = [
    ['/app', 'house', 'Inicio'],
    ['/mis-confesiones', 'clock-rotate-left', 'Mis Confesiones'],
    ['/notificaciones', 'bell', 'Notificaciones'],
    ['/guardados', 'bookmark', 'Guardados'],
    ['/favoritos', 'heart', 'Favoritos'],
    ['/perfil', 'circle-user', 'Mi Perfil'],
    ...(profile?.role === 'moderator' || profile?.role === 'admin' ? [['/moderacion', 'flag', 'Moderación']] : []),
    ...(profile?.role === 'admin' ? [['/admin', 'gauge-high', 'Administración']] : []),
  ]

  return (
    <aside className="app-sidebar">
      <Link to="/app"><BrandLogo /></Link>
      <nav aria-label="Navegación de la aplicación">
        {items.map(([to, icon, label]) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/app'}
            className={({ isActive }) => (isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link')}
          >
            <span><Icon name={icon} /></span>{label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-quote glass-card"><Icon name="heart" regular /><p>Buenas ideas también conectan corazones.</p></div>
    </aside>
  )
}


function DemoSidebar() {
  return (
    <aside className="app-sidebar demo-sidebar">
      <Link to="/demo"><BrandLogo /></Link>
      <div className="demo-mode-chip"><Icon name="flask" /> MODO DEMO</div>
      <nav aria-label="Navegación de demostración">
        <NavLink to="/demo" className="sidebar-link sidebar-link--active"><span><Icon name="house" /></span>Vista general</NavLink>
        <Link to="/home" className="sidebar-link"><span><Icon name="arrow-left" /></span>Volver al inicio</Link>
      </nav>
      <div className="sidebar-quote glass-card"><Icon name="circle-info" /><p>Ninguna acción de esta pantalla modifica datos reales.</p></div>
    </aside>
  )
}

function DemoPage() {
  const [searchText, setSearchText] = useState('')
  const { user } = useAuth()

  const visibleDemoConfessions = useMemo(() => {
    const normalized = searchText.trim().toLowerCase()
    if (!normalized) return demoConfessions
    return demoConfessions.filter((item) =>
      `${item.text} ${item.recipientText || ''} ${(item.tags ?? []).join(' ')}`.toLowerCase().includes(normalized),
    )
  }, [searchText])

  return (
    <div className="app-layout page-shell demo-page">
      <SkipLink />
      <DemoSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <div className="demo-banner" role="status">
          <div><Icon name="flask" /><strong>Estás viendo la versión DEMO</strong></div>
          <span>Los perfiles, confesiones, contadores y acciones de esta pantalla son ficticios. No se guardan ni modifican datos en Firebase.</span>
          <Link className="button button--primary" to={user ? '/app' : '/registro'}>
            <Icon name={user ? 'arrow-right' : 'user-plus'} /> {user ? 'Ir a la app real' : 'Entrar a la app real'}
          </Link>
        </div>

        <header className="app-topbar glass-card demo-topbar">
          <label className="app-search">
            <span><Icon name="magnifying-glass" /></span>
            <span className="sr-only">Buscar contenido ficticio de la demo</span>
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar en la demo…" />
          </label>
          <span className="demo-pill"><Icon name="flask" /> Datos ficticios</span>
        </header>

        <section className="dashboard-grid">
          <div className="feed-column">
            <section className="dashboard-hero glass-card demo-hero">
              <div><p className="eyebrow">VISTA DE DEMOSTRACIÓN</p><h2>Explora ITLA Crush <span>sin tocar datos reales ♡</span></h2><p>Esta ruta reproduce la experiencia visual de la aplicación usando contenido local de ejemplo.</p></div>
              <div className="dashboard-hero__note">DEMO<br/>NO OFICIAL</div>
            </section>

            <section className="quick-compose glass-card demo-disabled-control" aria-disabled="true">
              <div className="avatar" aria-hidden="true">D</div>
              <span>La publicación está deshabilitada en la demo.</span>
              <Link className="button button--primary" to={user ? '/crear' : '/registro'}>{user ? 'Publicar en la app real' : 'Regístrate para publicar'}</Link>
            </section>

            <div className="feed-tabs" role="tablist" aria-label="Filtros de demostración">
              <button className="active" role="tab" aria-selected="true">Ejemplos</button>
              <button role="tab" aria-selected="false" disabled>Para ti</button>
              <button role="tab" aria-selected="false" disabled>Tendencias</button>
            </div>

            <div className="feed-list">
              {visibleDemoConfessions.length === 0 && <div className="glass-card empty-state">No hay ejemplos que coincidan con esa búsqueda.</div>}
              {visibleDemoConfessions.map((item) => (
                <div className="demo-card-wrap" key={item.id}>
                  <span className="demo-card-label"><Icon name="flask" /> Ejemplo ficticio</span>
                  <PublicConfessionCard item={item} isDemo />
                </div>
              ))}
            </div>
          </div>

          <aside className="right-rail">
            <section className="glass-card rail-card demo-info-card">
              <div className="rail-title"><h3><Icon name="circle-info" /> ¿Qué es esta demo?</h3></div>
              <p>Una vista aislada para probar diseño, navegación y responsive sin autenticación y sin mezclar contenido ficticio con el feed real.</p>
            </section>
            <section className="glass-card rail-card">
              <div className="rail-title"><h3><Icon name="shield-halved" /> Separación de entornos</h3></div>
              <div className="demo-environment-list">
                <span><b>/demo</b><small>Contenido ficticio, solo interfaz.</small></span>
                <span><b>/app</b><small>Aplicación real protegida y conectada a Firebase.</small></span>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <nav className="mobile-bottom-nav demo-mobile-nav">
        <Link to="/home"><Icon name="arrow-left" /><small>Inicio</small></Link>
        <Link to="/demo"><Icon name="flask" /><small>Demo</small></Link>
        <Link className="mobile-create" to={user ? '/app' : '/registro'}><Icon name="arrow-right" /><small>App real</small></Link>
        <Link to="/normas"><Icon name="flag" /><small>Normas</small></Link>
        <Link to="/home"><Icon name="house" /><small>Portada</small></Link>
      </nav>
    </div>
  )
}

function useSocialPreferences(uid) {
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [savedIds, setSavedIds] = useState(() => new Set())

  useEffect(() => {
    if (!uid) return undefined
    const unsubscribeLikes = subscribeMyReactionIds(
      uid,
      setLikedIds,
      (error) => console.error('No se pudieron cargar tus favoritos.', error),
    )
    const unsubscribeSaved = subscribeSavedConfessionIds(
      uid,
      setSavedIds,
      (error) => console.error('No se pudieron cargar tus guardados.', error),
    )
    return () => {
      unsubscribeLikes()
      unsubscribeSaved()
    }
  }, [uid])

  return { likedIds, savedIds }
}

function FeedPage() {
  const [searchText, setSearchText] = useState('')
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [safetyError, setSafetyError] = useState('')
  const { items: publicConfessions, loading, error } = usePublicConfessions()
  const { user, profile } = useAuth()
  const { likedIds, savedIds } = useSocialPreferences(user?.uid)
  const navigate = useNavigate()
  const location = useLocation()
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

  useEffect(() => {
    const confessionId = new URLSearchParams(location.search).get('confession')
    if (!confessionId || visibleConfessions.length === 0) return
    const target = document.getElementById(`confession-${confessionId}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [location.search, visibleConfessions.length])

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

  const handleToggleLike = (confessionId) => toggleReaction({
    confessionId,
    user,
    profile,
  })

  const handleToggleSave = (confessionId) => toggleSaved({
    uid: user.uid,
    confessionId,
  })

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <header className="app-topbar glass-card">
          <label className="app-search"><span><Icon name="magnifying-glass" /></span><span className="sr-only">Buscar confesiones o hashtags</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar confesiones o #hashtags…" /></label>
          <div className="topbar-actions"><Link to="/notificaciones" aria-label="Notificaciones"><Icon name="bell" regular /></Link><button aria-label="Tema"><Icon name="sun" regular /></button><Link to="/perfil" className="mini-profile"><div className="avatar">{initial}</div><span><strong>{name}</strong><small>Cuenta autenticada ♥</small></span></Link></div>
        </header>

        <section className="dashboard-grid">
          <div className="feed-column">
            <section className="dashboard-hero glass-card">
              <div><p className="eyebrow">CONFIESA. CONECTA. COMPARTE.</p><h2>Aquí también nacen <span>grandes historias ♡</span></h2></div>
              <div className="dashboard-hero__note">Más que una U,<br/>conexiones reales ♡</div>
            </section>

            <section
              className="quick-compose glass-card"
              onClick={() => navigate('/crear')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate('/crear')
                }
              }}
              role="button"
              tabIndex="0"
              aria-label="Crear una nueva confesión"
            >
              <div className="avatar">{initial}</div><span>¿Qué quieres confesar hoy?</span><button className="button button--primary">Publicar</button>
            </section>

            <div className="feed-tabs" role="tablist" aria-label="Filtros del feed"><button className="active" role="tab" aria-selected="true">Más recientes</button><button role="tab" aria-selected="false" disabled>Para ti</button><button role="tab" aria-selected="false" disabled>Tendencias</button></div>
            <div className="feed-list">
              {safetyError && <div className="auth-message auth-message--error" role="alert">{safetyError}</div>}
              {loading && <div className="glass-card empty-state" role="status" aria-live="polite">Sincronizando con Firestore…</div>}
              {!loading && error && <div className="glass-card empty-state" role="alert">{error}</div>}
              {!loading && !error && visibleConfessions.length === 0 && <div className="glass-card empty-state">No encontramos confesiones públicas con esa búsqueda.</div>}
              {visibleConfessions.map((item) => (
                <PublicConfessionCard
                  item={item}
                  key={item.id}
                  socialEnabled
                  isLiked={likedIds.has(item.id)}
                  isSaved={savedIds.has(item.id)}
                  onToggleLike={handleToggleLike}
                  onToggleSave={handleToggleSave}
                  onHide={handleHide}
                  onReport={handleReport}
                />
              ))}
            </div>
          </div>

          <aside className="right-rail">
            <section className="glass-card rail-card"><div className="rail-title"><h3>🔥 Temas de la comunidad</h3></div>{trends.map(([tag, description], index) => <div className="trend-row" key={tag}><b>{index + 1}</b><span><strong>{tag}</strong><small>{description}</small></span></div>)}</section>
            <section className="glass-card rail-card"><div className="rail-title"><h3>Acciones rápidas</h3></div><div className="quick-grid"><Link to="/crear"><Icon name="heart" /><span>Nueva confesión</span></Link><Link to="/notificaciones"><Icon name="bell" regular /><span>Notificaciones</span></Link><Link to="/guardados"><Icon name="bookmark" regular /><span>Guardados</span></Link><Link to="/favoritos"><Icon name="heart" regular /><span>Favoritos</span></Link></div></section>
          </aside>
        </section>
      </main>
      <nav className="mobile-bottom-nav"><Link to="/app"><Icon name="house" /><small>Inicio</small></Link><Link to="/notificaciones"><Icon name="bell" regular /><small>Alertas</small></Link><Link className="mobile-create" to="/crear"><Icon name="plus" /><small>Crear</small></Link><Link to="/guardados"><Icon name="bookmark" regular /><small>Guardados</small></Link><Link to="/perfil"><Icon name="circle-user" regular /><small>Perfil</small></Link></nav>
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
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
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


const emptyAdminMetrics = {
  users: { total: 0, active: 0, restricted: 0, admins: 0, moderators: 0 },
  confessions: { total: 0, public: 0, private: 0, anonymous: 0, active: 0, underReview: 0, removed: 0 },
  reports: { total: 0, open: 0, reviewing: 0, resolved: 0, dismissed: 0 },
  moderationCases: 0,
}

function SocialCollectionPage({ mode }) {
  const { user, profile } = useAuth()
  const { likedIds, savedIds } = useSocialPreferences(user?.uid)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isFavorites = mode === 'favorites'

  useEffect(() => {
    if (!user) return undefined
    const subscribe = isFavorites ? subscribeFavoriteConfessions : subscribeSavedConfessions
    return subscribe(
      user.uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (subscriptionError) => {
        console.error('No se pudo cargar la colección social.', subscriptionError)
        setError(isFavorites ? 'No pudimos cargar tus favoritos.' : 'No pudimos cargar tus guardados.')
        setLoading(false)
      },
    )
  }, [isFavorites, user])

  const handleToggleLike = (confessionId) => toggleReaction({ confessionId, user, profile })
  const handleToggleSave = (confessionId) => toggleSaved({ uid: user.uid, confessionId })

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">{isFavorites ? 'TUS REACCIONES' : 'TU COLECCIÓN'}</p>
            <h2>{isFavorites ? <>Tus <span>favoritos ♡</span></> : <>Confesiones <span>guardadas ♡</span></>}</h2>
            <p>{isFavorites ? 'Publicaciones a las que has reaccionado.' : 'Publicaciones que guardaste para volver a leerlas después.'}</p>
          </div>
          <div className="dashboard-hero__note">{isFavorites ? 'ME GUSTA' : 'GUARDADOS'}<br/>PERSONALES</div>
        </section>

        <div className="feed-list social-collection-list">
          {loading && <div className="glass-card empty-state" role="status">Cargando…</div>}
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="glass-card empty-state">{isFavorites ? 'Todavía no tienes confesiones favoritas.' : 'Todavía no has guardado ninguna confesión.'}</div>}
          {items.map((item) => (
            <PublicConfessionCard
              key={item.id}
              item={item}
              socialEnabled
              isLiked={likedIds.has(item.id)}
              isSaved={savedIds.has(item.id)}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    return subscribeSocialNotifications(
      user.uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (notificationError) => {
        console.error('No se pudieron cargar las notificaciones.', notificationError)
        setError('No pudimos cargar tus notificaciones.')
        setLoading(false)
      },
    )
  }, [user])

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">ACTIVIDAD SOCIAL</p><h2>Tus <span>notificaciones ♡</span></h2><p>Reacciones y comentarios recibidos en tus confesiones públicas.</p></div>
          <div className="dashboard-hero__note">ACTIVIDAD<br/>RECIENTE</div>
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
    </div>
  )
}

function AdminMetricCard({ icon, label, value, detail, tone = 'default' }) {
  return (
    <article className={`glass-card admin-metric admin-metric--${tone}`}>
      <div className="admin-metric__icon"><Icon name={icon} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  )
}

function AdminPage() {
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
            <div className="admin-health-row"><span>Firebase</span><b className="status-ok"><Icon name="circle-check" /> Configurado</b></div>
            <div className="admin-health-row"><span>Sesión administrativa</span><b className="status-ok"><Icon name="circle-check" /> Activa</b></div>
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
                  <span>{item.visibility}</span>
                  <span className={`admin-status admin-status--${item.status}`}>{item.status}</span>
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
                  <span className={`moderation-status moderation-status--${item.status}`}>{item.status}</span>
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
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
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
                aria-label={`Nota interna para el reporte ${report.id}`}
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
    <main id="main-content" className="create-page page-shell" tabIndex="-1">
      <SkipLink />
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
            <div className="choice-card glass-card"><div><strong>◉ Público</strong><small>Visible para la comunidad</small></div><button type="button" aria-pressed={isPublic} aria-label="Publicar como contenido público" className={`toggle ${isPublic ? 'toggle--on' : ''}`} onClick={() => setIsPublic(true)}><span /></button><div><strong>♢ Privado</strong><small>Visible solo para tu cuenta por ahora</small></div><button type="button" aria-pressed={!isPublic} aria-label="Guardar como contenido privado" className={`toggle ${!isPublic ? 'toggle--on' : ''}`} onClick={() => setIsPublic(false)}><span /></button></div>
            <div className="choice-card glass-card"><div><strong>◉ Anónimo</strong><small>Tu identidad se oculta ante otros usuarios</small></div><button type="button" aria-pressed={isAnonymous} aria-label="Publicar de forma anónima" className={`toggle ${isAnonymous ? 'toggle--on' : ''}`} onClick={() => setIsAnonymous(true)}><span /></button><div><strong>◯ Identificado</strong><small>Tu nombre será visible</small></div><button type="button" aria-pressed={!isAnonymous} aria-label="Publicar mostrando mi identidad" className={`toggle ${!isAnonymous ? 'toggle--on' : ''}`} onClick={() => setIsAnonymous(false)}><span /></button></div>
            {isAnonymous && <div className="anonymous-disclosure"><strong>🕶️ Anónimo para la comunidad, no para la plataforma.</strong>El documento público no expone tu UID. La trazabilidad se guarda por separado y solo puede consultarla tu cuenta o moderación autorizada. <Link to="/privacidad">Conoce cómo funciona.</Link></div>}
            <button className="button button--primary publish-button" disabled={!message.trim() || submitting}>{submitting ? 'Publicando…' : '↗ Publicar Confesión'}</button>
          </form>
        )}
      </div>
    </main>
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
        <Link to="/home"><BrandLogo /></Link>
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
  return <div className="not-found page-shell"><BrandLogo/><h1>404</h1><p>Esta historia todavía no existe.</p><Link className="button button--primary" to="/home">Volver al inicio</Link></div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/home" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/app" element={<FeedPage />} />
      <Route path="/crear" element={<CreateConfessionPage />} />
      <Route path="/mis-confesiones" element={<MyConfessionsPage />} />
      <Route path="/notificaciones" element={<NotificationsPage />} />
      <Route path="/guardados" element={<SocialCollectionPage mode="saved" />} />
      <Route path="/favoritos" element={<SocialCollectionPage mode="favorites" />} />
      <Route path="/moderacion" element={<ModerationPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/registro" element={<AuthPage mode="register" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
