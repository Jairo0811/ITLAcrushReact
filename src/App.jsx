import { useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

const confessions = [
  {
    id: 1,
    author: 'Anónimo',
    badge: 'Estudiante',
    time: 'hace 2 horas',
    text: 'Me gusta alguien de mi clase de programación… Siempre me ayuda y tiene una vibra increíble. ¿Alguien más siente que en el ITLA el amor también compila?',
    tags: ['#AmorITLA', '#Programación'],
    likes: 248,
    comments: 37,
    anonymous: true,
  },
  {
    id: 2,
    author: 'María S.',
    badge: 'Software',
    time: 'hace 4 horas',
    text: 'ITLA no solo me está formando profesionalmente, también me dio amistades que se sienten como familia. Qué suerte la mía. 💕',
    tags: ['#Gratitud', '#VidaITLA'],
    likes: 312,
    comments: 12,
    anonymous: false,
  },
  {
    id: 3,
    author: 'Crush Secreto',
    badge: 'Anónimo',
    time: 'hace 6 horas',
    text: 'Hay miradas en la biblioteca que dicen más que mil palabras…',
    tags: ['#Biblioteca', '#CrushSecreto'],
    likes: 190,
    comments: 28,
    anonymous: true,
  },
]

const trends = [
  ['#AmorITLA', '1.2K publicaciones'],
  ['#VidaITLA', '892 publicaciones'],
  ['#Biblioteca', '745 publicaciones'],
  ['#CrushSecreto', '623 publicaciones'],
  ['#IngenieríaDelAmor', '410 publicaciones'],
]

function BrandLogo({ compact = false }) {
  return (
    <div className={`brand-logo ${compact ? 'brand-logo--compact' : ''}`} aria-label="ITLA Crush">
      <span className="brand-logo__itla">ITLA</span>
      <span className="brand-logo__crush">CRUSH <span aria-hidden="true">♥</span></span>
      {!compact && <small>CONFIESA. CONECTA. COMPARTE.</small>}
    </div>
  )
}

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>
}

function PublicConfessionCard({ item }) {
  const [liked, setLiked] = useState(false)
  return (
    <article className="confession-card glass-card">
      <div className="confession-card__header">
        <div className={`avatar ${item.anonymous ? 'avatar--anonymous' : ''}`}>{item.anonymous ? '◉' : item.author.charAt(0)}</div>
        <div>
          <strong>{item.author}</strong>
          <div className="muted-row"><span className="tiny-badge">{item.badge}</span><span>{item.time}</span></div>
        </div>
        <button className="icon-button" aria-label="Más opciones">•••</button>
      </div>
      <p>{item.text}</p>
      <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="card-actions">
        <button onClick={() => setLiked((value) => !value)} className={liked ? 'is-liked' : ''}>♥ {item.likes + (liked ? 1 : 0)}</button>
        <button>◌ {item.comments}</button>
        <button>↗ Compartir</button>
        <button className="bookmark" aria-label="Guardar">♡</button>
      </div>
    </article>
  )
}

function LandingPage() {
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
          <Link className="button button--ghost" to="/login">Iniciar sesión</Link>
          <Link className="button button--primary" to="/registro">Regístrate</Link>
        </div>
      </header>

      <main id="inicio" className="landing-main content-width">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">CONFIESA. CONECTA. <span>COMPARTE.</span></p>
            <h1>Las confesiones también crean <span>conexiones</span></h1>
            <p className="hero-description">Un espacio moderno para decir lo que sientes, descubrir historias de tu comunidad y conectar sin perder el control de tu privacidad.</p>
            <div className="hero-actions">
              <Link className="button button--primary button--large" to="/registro">Únete ahora <span>→</span></Link>
              <Link className="button button--soft button--large" to="/app">Ver demo</Link>
            </div>
            <div className="benefit-row">
              <span><Icon>◉</Icon>Anónimo</span>
              <span><Icon>♥</Icon>Real</span>
              <span><Icon>◇</Icon>Con control</span>
              <span><Icon>◌</Icon>Comunidad</span>
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
          <div><strong>100%</strong><span>Control sobre tu identidad</span></div>
          <div className="stats-panel__highlight"><strong>La comunidad que se atreve ♡</strong></div>
        </section>

        <section id="confesiones" className="landing-feed">
          <div className="section-heading">
            <div><p className="eyebrow">HISTORIAS REALES</p><h2>Confesiones públicas</h2><p>Sentimientos, amistades y momentos que forman parte de la vida ITLA.</p></div>
            <Link to="/app">Ver todas →</Link>
          </div>
          <div className="landing-card-grid">
            {confessions.map((item) => <PublicConfessionCard item={item} key={item.id} />)}
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
  const items = [
    ['/', '⌂', 'Inicio'],
    ['/app', '⌕', 'Explorar'],
    ['/app', '◌', 'Mis Confesiones'],
    ['/app', '↗', 'Mensajes'],
    ['/app', '♢', 'Notificaciones'],
    ['/app', '♡', 'Guardados'],
    ['/app', '♥', 'Favoritos'],
    ['/app', '◯', 'Mi Perfil'],
  ]
  return (
    <aside className="app-sidebar">
      <Link to="/"><BrandLogo /></Link>
      <nav>
        {items.map(([to, icon, label], index) => (
          <NavLink key={`${label}-${index}`} to={to} className={({ isActive }) => (index === 1 && isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link')}>
            <span>{icon}</span>{label}{label === 'Mensajes' && <b>3</b>}{label === 'Notificaciones' && <b>12</b>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-quote glass-card">♡<p>Buenas ideas también conectan corazones.</p></div>
    </aside>
  )
}

function FeedPage() {
  const [query, setQuery] = useState('')
  const visibleConfessions = useMemo(() => confessions.filter((item) => `${item.text} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query])
  const navigate = useNavigate()

  return (
    <div className="app-layout page-shell">
      <AppSidebar />
      <main className="app-main">
        <header className="app-topbar glass-card">
          <label className="app-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar confesiones, personas o #hashtags…" /></label>
          <div className="topbar-actions"><button>♢<span className="notification-dot">12</span></button><button>☼</button><div className="mini-profile"><div className="avatar">A</div><span><strong>Ana Torres</strong><small>Sigue sintiendo ♥</small></span></div></div>
        </header>

        <section className="dashboard-grid">
          <div className="feed-column">
            <section className="dashboard-hero glass-card">
              <div><p className="eyebrow">CONFIESA. CONECTA. COMPARTE.</p><h2>Aquí también nacen <span>grandes historias ♡</span></h2></div>
              <div className="dashboard-hero__note">Más que una U,<br/>conexiones reales ♡</div>
            </section>

            <section className="quick-compose glass-card" onClick={() => navigate('/crear')} role="button" tabIndex="0">
              <div className="avatar">A</div><span>¿Qué quieres confesar hoy?</span><button className="button button--primary">Publicar</button>
            </section>

            <div className="feed-tabs"><button className="active">Para ti</button><button>Más recientes</button><button>Tendencias</button></div>
            <div className="feed-list">
              {visibleConfessions.length ? visibleConfessions.map((item) => <PublicConfessionCard item={item} key={item.id} />) : <div className="glass-card empty-state">No encontramos confesiones con esa búsqueda.</div>}
            </div>
          </div>

          <aside className="right-rail">
            <section className="glass-card rail-card"><div className="rail-title"><h3>🔥 Tendencias de hoy</h3><button>Ver todas</button></div>{trends.map(([tag, count], index) => <div className="trend-row" key={tag}><b>{index + 1}</b><span><strong>{tag}</strong><small>{count}</small></span></div>)}</section>
            <section className="glass-card rail-card"><div className="rail-title"><h3>Acciones rápidas</h3></div><div className="quick-grid"><Link to="/crear">♥<span>Buscar Crush</span></Link><Link to="/crear">▥<span>Crear encuesta</span></Link><Link to="/registro">＋<span>Invitar amigos</span></Link><Link to="/crear">◉<span>Modo anónimo</span></Link></div></section>
          </aside>
        </section>
      </main>
      <nav className="mobile-bottom-nav"><Link to="/app">⌂<small>Inicio</small></Link><Link to="/app">⌕<small>Explorar</small></Link><Link className="mobile-create" to="/crear">＋<small>Crear</small></Link><Link to="/app">♢<small>Alertas</small></Link><Link to="/app">◯<small>Perfil</small></Link></nav>
    </div>
  )
}

function CreateConfessionPage() {
  const navigate = useNavigate()
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [published, setPublished] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    if (!message.trim()) return
    setPublished(true)
  }

  return (
    <div className="create-page page-shell">
      <div className="create-card glass-card">
        <button className="back-button" onClick={() => navigate('/app')}>← Volver</button>
        <BrandLogo compact />
        <div className="create-heading"><div className="send-icon">↗</div><h1>Tu historia también cuenta</h1><p>Confiesa. Conecta. Comparte.</p></div>
        {published ? (
          <div className="success-panel"><span>♡</span><h2>Confesión preparada</h2><p>La interfaz ya refleja el flujo del mockup. En la siguiente fase conectaremos este envío con Firebase y las reglas de seguridad.</p><button className="button button--primary" onClick={() => navigate('/app')}>Volver al feed</button></div>
        ) : (
          <form onSubmit={submit} className="confession-form">
            <label><span>Para…</span><input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="@usuario, carrera, grupo o alguien en ITLA" /></label>
            <label><span>Tu confesión…</span><textarea value={message} maxLength="500" onChange={(event) => setMessage(event.target.value)} placeholder="Escribe aquí tu mensaje…"/><small>{message.length}/500</small></label>
            <div className="choice-card glass-card"><div><strong>◉ Público</strong><small>Visible para la comunidad</small></div><button type="button" className={`toggle ${isPublic ? 'toggle--on' : ''}`} onClick={() => setIsPublic(true)}><span /></button><div><strong>♢ Privado</strong><small>Solo la persona podrá verlo</small></div><button type="button" className={`toggle ${!isPublic ? 'toggle--on' : ''}`} onClick={() => setIsPublic(false)}><span /></button></div>
            <div className="choice-card glass-card"><div><strong>◉ Anónimo</strong><small>Tu identidad será oculta</small></div><button type="button" className={`toggle ${isAnonymous ? 'toggle--on' : ''}`} onClick={() => setIsAnonymous(true)}><span /></button><div><strong>◯ Identificado</strong><small>Tu nombre será visible</small></div><button type="button" className={`toggle ${!isAnonymous ? 'toggle--on' : ''}`} onClick={() => setIsAnonymous(false)}><span /></button></div>
            <button className="button button--primary publish-button" disabled={!message.trim()}>↗ Publicar Confesión</button>
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
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/registro" element={<AuthPage mode="register" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
