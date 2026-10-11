import { NavLink } from 'react-router-dom'
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
