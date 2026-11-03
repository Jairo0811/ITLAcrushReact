import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { buildDemoConfessions } from '../data/demoConfessions.js'
import { PublicConfessionCard } from '../components/ConfessionCard.jsx'
import { BrandLogo, Icon, SkipLink } from '../components/ui.jsx'

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

export default function DemoPage() {
  const demoConfessions = useMemo(() => buildDemoConfessions(), [])
  const [searchText, setSearchText] = useState('')
  const { user } = useAuth()

  const visibleDemoConfessions = useMemo(() => {
    const normalized = searchText.trim().toLowerCase()
    if (!normalized) return demoConfessions
    return demoConfessions.filter((item) =>
      `${item.text} ${item.recipientText || ''} ${(item.tags ?? []).join(' ')}`.toLowerCase().includes(normalized),
    )
  }, [demoConfessions, searchText])

  return (
    <div className="app-layout page-shell demo-page">
      <SkipLink />
      <DemoSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <div className="demo-banner" role="status">
          <div className="demo-banner__lead">
            <span className="demo-banner__icon"><Icon name="flask" /></span>
            <span><strong>Modo demo</strong><small>Entorno aislado de la aplicación real</small></span>
          </div>
          <div className="demo-banner__facts" aria-label="Características del entorno demo">
            <span>Datos locales</span>
            <span>Firebase sin escrituras</span>
          </div>
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
              <div className="dashboard-hero__copy">
                <p className="eyebrow">ENTORNO DE DEMOSTRACIÓN</p>
                <h2>Explora la experiencia <span>sin tocar datos reales.</span></h2>
                <p>Prueba navegación, búsqueda y responsive con contenido local de ejemplo. Esta vista no crea, modifica ni elimina información en Firebase.</p>
                <div className="demo-hero__meta">
                  <span><Icon name="database" /> Datos locales</span>
                  <span><Icon name="shield-halved" /> Entorno separado</span>
                  <span><Icon name="mobile-screen-button" /> Responsive</span>
                </div>
              </div>
              <div className="demo-environment-badge" aria-label="Ruta de demostración">
                <span>/demo</span>
                <small>NO OFICIAL</small>
              </div>
            </section>

            <section className="quick-compose glass-card demo-disabled-control" aria-disabled="true">
              <div className="avatar" aria-hidden="true">D</div>
              <span><strong>Publicación deshabilitada</strong><small>La demo nunca escribe contenido en Firebase.</small></span>
              <Link className="button button--primary" to={user ? '/crear' : '/registro'}>{user ? 'Publicar en la app real' : 'Regístrate para publicar'}</Link>
            </section>

            <div className="feed-tabs"><h2 className="feed-tabs__label">Ejemplos</h2></div>

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
        <Link to="/privacidad"><Icon name="shield-halved" /><small>Privacidad</small></Link>
      </nav>
    </div>
  )
}
