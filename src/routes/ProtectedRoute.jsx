import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, profile, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="auth-loading page-shell" role="status">Conectando con ITLA Crush… ♡</div>
  }

  if (!isConfigured || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (profile?.status && profile.status !== 'active') {
    return (
      <div className="not-found page-shell">
        <h1>Cuenta restringida</h1>
        <p>Tu cuenta no puede acceder a las funciones de la comunidad mientras tenga el estado “{profile.status}”.</p>
      </div>
    )
  }

  return children
}
