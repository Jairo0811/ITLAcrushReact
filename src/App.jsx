import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import LegalPage from './LegalPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import CreateConfessionPage from './pages/CreateConfessionPage.jsx'
import DemoPage from './pages/DemoPage.jsx'
import FeedPage from './pages/FeedPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import MyConfessionsPage from './pages/MyConfessionsPage.jsx'
import NotFound from './pages/NotFound.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import PasswordResetPage from './pages/PasswordResetPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SocialCollectionPage from './pages/SocialCollectionPage.jsx'
import './App.css'

// El código de administración y moderación solo se descarga para quienes tienen acceso.
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const ModerationPage = lazy(() => import('./pages/ModerationPage.jsx'))

const PAGE_TITLES = {
  '/home': 'Inicio',
  '/demo': 'Demo',
  '/login': 'Iniciar sesión',
  '/registro': 'Registro',
  '/recuperar': 'Recuperar contraseña',
  '/app': 'Feed',
  '/crear': 'Nueva confesión',
  '/mis-confesiones': 'Mis confesiones',
  '/notificaciones': 'Notificaciones',
  '/guardados': 'Guardados',
  '/favoritos': 'Favoritos',
  '/perfil': 'Mi perfil',
  '/moderacion': 'Moderación',
  '/admin': 'Administración',
  '/terminos': 'Términos de uso',
  '/privacidad': 'Privacidad',
  '/normas': 'Normas de la comunidad',
  '/legal': 'Información legal',
}

function usePageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const title = PAGE_TITLES[pathname]
    document.title = title ? `${title} | ITLA Crush` : 'ITLA Crush'
  }, [pathname])
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading" role="status">Restaurando tu sesión en ITLA Crush…</div>
  return <Navigate to={user ? '/app' : '/home'} replace />
}

function PageFallback() {
  return <div className="auth-loading page-shell" role="status">Cargando…</div>
}

export default function App() {
  usePageTitle()

  return (
    <NotificationsProvider>
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/registro" element={<AuthPage mode="register" />} />
        <Route path="/recuperar" element={<PasswordResetPage />} />
        <Route path="/terminos" element={<LegalPage focus="terminos" />} />
        <Route path="/privacidad" element={<LegalPage focus="privacidad" />} />
        <Route path="/normas" element={<LegalPage focus="comunidad" />} />
        <Route path="/legal" element={<LegalPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<FeedPage />} />
          <Route path="/crear" element={<CreateConfessionPage />} />
          <Route path="/mis-confesiones" element={<MyConfessionsPage />} />
          <Route path="/notificaciones" element={<NotificationsPage />} />
          <Route path="/guardados" element={<SocialCollectionPage mode="saved" />} />
          <Route path="/favoritos" element={<SocialCollectionPage mode="favorites" />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'moderator']} />}>
          <Route path="/moderacion" element={<ModerationPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </NotificationsProvider>
  )
}
