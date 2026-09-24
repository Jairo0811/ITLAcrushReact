import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="auth-loading page-shell" role="status">Conectando con ITLA Crush… ♡</div>
  }

  if (!isConfigured || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
