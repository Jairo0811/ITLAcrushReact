import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { Icon, SkipLink } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeHiddenConfessions, unhideConfession } from '../services/trustSafetyService.js'

export default function HiddenConfessionsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState('')
  const uid = user?.uid

  useEffect(() => {
    if (!uid) return undefined
    return subscribeHiddenConfessions(
      uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (readError) => {
        console.error('No se pudieron leer tus publicaciones ocultas.', readError)
        setError('No pudimos cargar tus publicaciones ocultas.')
        setLoading(false)
      },
    )
  }, [uid])

  const restore = async (id) => {
    if (pendingId) return
    setPendingId(id)
    setError('')
    try {
      await unhideConfession({ confessionId: id, ownerUid: uid })
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (restoreError) {
      console.error('No se pudo recuperar la publicación.', restoreError)
      setError('No pudimos volver a mostrar esa publicación. Inténtalo de nuevo.')
    } finally {
      setPendingId('')
    }
  }

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">TU PRIVACIDAD</p>
            <h1>Publicaciones <span>ocultas</span></h1>
            <p>Las publicaciones que ocultaste sólo desaparecen de tu feed. Puedes recuperarlas aquí cuando quieras.</p>
            <Link className="button button--soft" to="/app"><Icon name="arrow-left" /> Volver al inicio</Link>
          </div>
        </section>
        {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
        {loading && <div className="glass-card empty-state" role="status">Cargando publicaciones ocultas…</div>}
        {!loading && !error && items.length === 0 && (
          <div className="glass-card empty-state">No tienes publicaciones ocultas.</div>
        )}
        {!loading && items.length > 0 && (
          <ul className="hidden-confession-list" aria-label="Tus publicaciones ocultas">
            {items.map((item) => (
              <li className="glass-card hidden-confession-row" key={item.id}>
                <p>{item.preview || 'Esta publicación ya no está disponible para leerla.'}</p>
                <button
                  type="button"
                  className="button button--soft"
                  onClick={() => restore(item.id)}
                  disabled={Boolean(pendingId)}
                  aria-label={`Volver a mostrar publicación ${item.id}`}
                >
                  <Icon name="eye" /> {pendingId === item.id ? 'Recuperando…' : 'Volver a mostrar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <AppMobileNav />
    </div>
  )
}
