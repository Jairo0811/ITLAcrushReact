from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path, old, new):
    content = read(path)
    if new in content:
        return
    if old not in content:
        raise RuntimeError(f'No se encontró el bloque esperado en {path}: {old[:120]!r}')
    write(path, content.replace(old, new, 1))


# Shared UI primitives.
write('src/components/ui.jsx', '''export function BrandLogo({ compact = false }) {
  return (
    <div className={`brand-logo ${compact ? 'brand-logo--compact' : ''}`.trim()}>
      <img
        className="brand-logo__image"
        src="/itla-crush-logo-420.webp"
        alt="ITLA Crush"
        width="420"
        height="210"
        decoding="async"
      />
      {!compact && <small>CONFIESA. CONECTA. COMPARTE.</small>}
    </div>
  )
}

export function Icon({ name, regular = false, className = '' }) {
  return <i className={`${regular ? 'fa-regular' : 'fa-solid'} fa-${name} icon ${className}`.trim()} aria-hidden="true" />
}

export function SkipLink() {
  return <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
}
''')

write('src/components/AppMobileNav.jsx', '''import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon } from './ui.jsx'

/**
 * Barra de navegación inferior para móvil (≤ 820px, el CSS la oculta en escritorio).
 * Se comparte entre todas las páginas autenticadas para que ninguna quede sin navegación.
 */
export default function AppMobileNav() {
  const { profile } = useAuth()

  // Quinto destino contextual: el personal interno ve su panel; el resto, Guardados.
  const contextual = profile?.role === 'admin'
    ? { to: '/admin', icon: 'gauge-high', label: 'Admin', regular: false }
    : profile?.role === 'moderator'
      ? { to: '/moderacion', icon: 'flag', label: 'Moderar', regular: false }
      : { to: '/guardados', icon: 'bookmark', label: 'Guardados', regular: true }

  const items = [
    { to: '/app', icon: 'house', label: 'Inicio', end: true },
    { to: '/notificaciones', icon: 'bell', label: 'Alertas', regular: true },
    { to: '/crear', icon: 'plus', label: 'Crear', className: 'mobile-create' },
    contextual,
    { to: '/perfil', icon: 'circle-user', label: 'Perfil', regular: true },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal móvil">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={item.className}>
          <Icon name={item.icon} regular={item.regular} />
          <small>{item.label}</small>
        </NavLink>
      ))}
    </nav>
  )
}
''')

# Accessibility check follows the shared SkipLink component.
replace_once(
    'scripts/check-accessibility.mjs',
    "const identity = read('src/IdentityShell.jsx')\nconst appCss = read('src/App.css')",
    "const identity = read('src/IdentityShell.jsx')\nconst ui = read('src/components/ui.jsx')\nconst appCss = read('src/App.css')",
)
replace_once(
    'scripts/check-accessibility.mjs',
    "['skip link disponible', /function\\s+SkipLink\\s*\\(/.test(app) || /function\\s+SkipLink\\s*\\(/.test(identity)],",
    "['skip link disponible', /function\\s+SkipLink\\s*\\(/.test(app + identity + ui)],",
)

# App imports + shared primitives.
replace_once(
    'src/App.jsx',
    "import { isFirebaseConfigured } from './services/firebase.js'\nimport './App.css'",
    "import { isFirebaseConfigured } from './services/firebase.js'\nimport AppMobileNav from './components/AppMobileNav.jsx'\nimport { BrandLogo, Icon, SkipLink } from './components/ui.jsx'\nimport './App.css'",
)
replace_once(
    'src/App.jsx',
    '''function BrandLogo({ compact = false }) {
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

''',
    '',
)
replace_once('src/App.jsx', 'src="/itla-crush-hero-phone.png"', 'src="/itla-crush-hero-phone.webp"')
replace_once(
    'src/App.jsx',
    '''            <div className="feed-tabs" role="tablist" aria-label="Filtros de demostración">
              <button className="active" role="tab" aria-selected="true">Ejemplos</button>
              <button role="tab" aria-selected="false" disabled>Para ti</button>
              <button role="tab" aria-selected="false" disabled>Tendencias</button>
            </div>''',
    '            <div className="feed-tabs"><h2 className="feed-tabs__label">Ejemplos</h2></div>',
)
replace_once(
    'src/App.jsx',
    '<Link to="/home"><Icon name="house" /><small>Portada</small></Link>',
    '<Link to="/privacidad"><Icon name="shield-halved" /><small>Privacidad</small></Link>',
)
replace_once(
    'src/App.jsx',
    "  const { likedIds, savedIds } = useSocialPreferences(user?.uid)\n  const navigate = useNavigate()\n  const location = useLocation()",
    "  const { likedIds, savedIds } = useSocialPreferences(user?.uid)\n  const location = useLocation()",
)
replace_once(
    'src/App.jsx',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <header className="app-topbar glass-card">''',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Feed de confesiones</h1>
        <header className="app-topbar glass-card">''',
)
replace_once(
    'src/App.jsx',
    '''            <section
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
            </section>''',
    '''            <Link className="quick-compose glass-card" to="/crear">
              <div className="avatar" aria-hidden="true">{initial}</div>
              <span>¿Qué quieres confesar hoy?</span>
              <span className="button button--primary">Publicar</span>
            </Link>''',
)
replace_once(
    'src/App.jsx',
    '<div className="feed-tabs" role="tablist" aria-label="Filtros del feed"><button className="active" role="tab" aria-selected="true">Más recientes</button><button role="tab" aria-selected="false" disabled>Para ti</button><button role="tab" aria-selected="false" disabled>Tendencias</button></div>',
    '<div className="feed-tabs"><h2 className="feed-tabs__label">Más recientes</h2></div>',
)
replace_once(
    'src/App.jsx',
    '<nav className="mobile-bottom-nav"><Link to="/app"><Icon name="house" /><small>Inicio</small></Link><Link to="/notificaciones"><Icon name="bell" regular /><small>Alertas</small></Link><Link className="mobile-create" to="/crear"><Icon name="plus" /><small>Crear</small></Link><Link to="/guardados"><Icon name="bookmark" regular /><small>Guardados</small></Link><Link to="/perfil"><Icon name="circle-user" regular /><small>Perfil</small></Link></nav>',
    '<AppMobileNav />',
)

# Page headings + mobile navigation on authenticated secondary pages.
replace_once(
    'src/App.jsx',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TU HISTORIAL</p>''',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Mis confesiones</h1>
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TU HISTORIAL</p>''',
)
replace_once(
    'src/App.jsx',
    '''        </div>
      </main>
    </div>
  )
}


const emptyAdminMetrics''',
    '''        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}


const emptyAdminMetrics''',
)
replace_once(
    'src/App.jsx',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">{isFavorites ? 'TUS REACCIONES' : 'TU COLECCIÓN'}</p>''',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Confesiones guardadas y favoritas</h1>
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">{isFavorites ? 'TUS REACCIONES' : 'TU COLECCIÓN'}</p>''',
)
replace_once(
    'src/App.jsx',
    '''        </div>
      </main>
    </div>
  )
}

function NotificationsPage()''',
    '''        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}

function NotificationsPage()''',
)
replace_once(
    'src/App.jsx',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">ACTIVIDAD SOCIAL</p>''',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Notificaciones</h1>
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">ACTIVIDAD SOCIAL</p>''',
)
replace_once(
    'src/App.jsx',
    '''        </section>
      </main>
    </div>
  )
}

function AdminMetricCard''',
    '''        </section>
      </main>
      <AppMobileNav />
    </div>
  )
}

function AdminMetricCard''',
)
replace_once(
    'src/App.jsx',
    '''        </section>
      </main>
    </div>
  )
}

function ModerationPage()''',
    '''        </section>
      </main>
      <AppMobileNav />
    </div>
  )
}

function ModerationPage()''',
)
replace_once(
    'src/App.jsx',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TRUST & SAFETY</p>''',
    '''      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Cola de moderación</h1>
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TRUST & SAFETY</p>''',
)
replace_once(
    'src/App.jsx',
    '''        </div>
      </main>
    </div>
  )
}

function CreateConfessionPage()''',
    '''        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}

function CreateConfessionPage()''',
)

# Remove the obsolete visual-only AuthPage and routes from App.jsx; IdentityShell owns real auth.
content = read('src/App.jsx')
start = content.find('function AuthPage({ mode }) {')
end = content.find('function NotFound()', start)
if start != -1:
    if end == -1:
        raise RuntimeError('No se encontró el final de AuthPage en src/App.jsx')
    content = content[:start] + content[end:]
write('src/App.jsx', content)
replace_once('src/App.jsx', '      <Route path="/login" element={<AuthPage mode="login" />} />\n', '')
replace_once('src/App.jsx', '      <Route path="/registro" element={<AuthPage mode="register" />} />\n', '')

# Identity shell uses shared UI and gives profile the same mobile navigation.
replace_once(
    'src/IdentityShell.jsx',
    "import ProtectedRoute from './routes/ProtectedRoute.jsx'\nimport './App.css'",
    "import ProtectedRoute from './routes/ProtectedRoute.jsx'\nimport AppMobileNav from './components/AppMobileNav.jsx'\nimport { BrandLogo, SkipLink } from './components/ui.jsx'\nimport './App.css'",
)
content = read('src/IdentityShell.jsx')
start = content.find('function BrandLogo() {')
end = content.find('function MicrosoftMark()', start)
if start != -1:
    if end == -1:
        raise RuntimeError('No se encontró MicrosoftMark tras BrandLogo')
    content = content[:start] + content[end:]
start = content.find('function SkipLink() {')
end = content.find('function AuthPage({ mode })', start)
if start != -1:
    if end == -1:
        raise RuntimeError('No se encontró AuthPage tras SkipLink')
    content = content[:start] + content[end:]
write('src/IdentityShell.jsx', content)
replace_once(
    'src/IdentityShell.jsx',
    '''        <div className="profile-actions">
          <Link className="button button--soft" to="/app">Volver al feed</Link>
          <button className="button button--primary" onClick={handleLogout} disabled={signingOut}>{signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>
        </div>
      </section>
    </main>''',
    '''        <div className="profile-actions">
          <Link className="button button--soft" to="/app">Volver al feed</Link>
          <Link className="button button--soft" to="/mis-confesiones">Mis confesiones</Link>
          <Link className="button button--soft" to="/guardados">Guardados</Link>
          <Link className="button button--soft" to="/favoritos">Favoritos</Link>
          <button className="button button--primary" onClick={handleLogout} disabled={signingOut}>{signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>
        </div>
      </section>
      <AppMobileNav />
    </main>''',
)

# CSS refinements from the reviewed patch.
css_marker = '/* =========================================================\n   Mejoras: navegación móvil compartida, pestañas y compose\n   ========================================================= */'
if css_marker not in read('src/App.css'):
    with (ROOT / 'src/App.css').open('a', encoding='utf-8') as handle:
        handle.write('''\n\n/* =========================================================
   Mejoras: navegación móvil compartida, pestañas y compose
   ========================================================= */
.quick-compose { text-decoration: none; color: inherit; }
.quick-compose > span.button { color: #fff; }

.feed-tabs__label {
  margin: 0;
  padding: 7px 0;
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  border-bottom: 2px solid var(--pink);
}

.mobile-bottom-nav a[aria-current="page"] { color: #fff; }
.mobile-bottom-nav a.mobile-create[aria-current="page"] { outline: 2px solid #fff; outline-offset: 2px; }

@media (max-width: 820px) {
  /* Evita que la barra fija tape el final del contenido, incluso con notch/home indicator */
  .auth-page.page-shell { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  .app-layout .app-main { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
}
''')

# WebP assets: preserve the hero dimensions and make a dedicated 420×210 logo asset.
def convert_webp(source, destination, *, size=None, quality=84):
    src = ROOT / source
    dst = ROOT / destination
    with Image.open(src) as image:
        image = image.convert('RGBA')
        if size:
            image.thumbnail(size, Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA', size, (0, 0, 0, 0))
            x = (size[0] - image.width) // 2
            y = (size[1] - image.height) // 2
            canvas.alpha_composite(image, (x, y))
            image = canvas
        image.save(dst, 'WEBP', quality=quality, method=6)

convert_webp('public/itla-crush-hero-phone.png', 'public/itla-crush-hero-phone.webp', quality=84)
convert_webp('public/itla-crush-logo.png', 'public/itla-crush-logo-420.webp', size=(420, 210), quality=88)

# This helper and its workflow are temporary and should not remain in the product branch.
(ROOT / '.github/scripts/apply-claude-hardening.py').unlink(missing_ok=True)
(ROOT / '.github/workflows/apply-claude-hardening.yml').unlink(missing_ok=True)

print('Claude hardening aplicado correctamente.')
