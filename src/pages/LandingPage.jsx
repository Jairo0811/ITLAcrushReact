import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { PublicConfessionCard } from '../components/ConfessionCard.jsx'
import { BrandLogo, Icon, SkipLink } from '../components/ui.jsx'
import { usePublicConfessions } from '../hooks/usePublicConfessions.js'

export default function LandingPage() {
  const { items: publicConfessions, loading, error } = usePublicConfessions({ pageSize: 3 })
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
          <div className="hero-visual hero-visual--asset">
            <img
              src="/itla-crush-hero-phone.webp"
              alt="Vista previa de ITLA Crush en un teléfono, con confesiones y temas de la comunidad"
              className="hero-phone-image"
              width="1254"
              height="1254"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </section>

        <section className="stats-panel glass-card" id="comunidad">
          <div><strong>Anónimo ante la comunidad</strong><span>Tu identidad no se muestra a otros estudiantes</span></div>
          <div><strong>Tú decides</strong><span>Público o privado, anónimo o con tu nombre</span></div>
          <div><strong>Con respeto</strong><span>Reporta lo que no esté bien y la moderación lo revisa</span></div>
          <div className="stats-panel__highlight"><strong>Hecho para estudiantes ♡</strong></div>
        </section>

        <section id="confesiones" className="landing-feed">
          <div className="section-heading">
            <div><p className="eyebrow">EN LA COMUNIDAD</p><h2>Confesiones públicas</h2><p>Las últimas historias que comparte la comunidad ITLA.</p></div>
            <Link to={user ? '/app' : '/demo'}>{user ? 'Abrir mi feed →' : 'Probar la demo →'}</Link>
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
