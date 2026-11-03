import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Se usa como ruta de layout: <Route element={<ProtectedRoute />}> ... </Route>.
 * También acepta children para usos puntuales.
 */
export default function ProtectedRoute({ children = null, allowedRoles = null }) {
  const { user, profile, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="auth-loading page-shell" role="status">Conectando con ITLA Crush… ♡</div>
  }

  if (!isConfigured || !user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (profile?.status && profile.status !== 'active') {
    return (
      <div className="not-found page-shell">
        <h1>Cuenta restringida</h1>
        <p>Tu cuenta no puede acceder a las funciones de la comunidad mientras tenga el estado “{profile.status}”.</p>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return (
      <div className="not-found page-shell">
        <h1>403</h1>
        <p>No tienes permisos para acceder a esta sección.</p>
      </div>
    )
  }

  return children ?? <Outlet />
}
