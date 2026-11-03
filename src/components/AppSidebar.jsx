import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { BrandLogo, Icon } from '../components/ui.jsx'

export default function AppSidebar() {
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
      <div className="sidebar-quote">
        <p>ITLA Crush es un proyecto académico no oficial.</p>
      </div>
    </aside>
  )
}
