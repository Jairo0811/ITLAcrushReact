import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { deleteOwnConfession, subscribeMyConfessions } from '../services/confessionService.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { PublicConfessionCard } from '../components/ConfessionCard.jsx'
import { SkipLink } from '../components/ui.jsx'

export default function MyConfessionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    const unsubscribe = subscribeMyConfessions(
      user.uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (readError) => {
        console.error('No se pudieron cargar tus confesiones.', readError)
        setError('No pudimos cargar tus confesiones.')
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  const remove = async (confessionId) => {
    try {
      await deleteOwnConfession(confessionId)
      setItems((current) => current.filter((item) => item.id !== confessionId))
    } catch (deleteError) {
      console.error('No se pudo retirar la confesión.', deleteError)
      setError('No pudimos retirar esa confesión.')
    }
  }

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Mis confesiones</h1>
        <section className="dashboard-hero glass-card">
          <div><p className="eyebrow">TU HISTORIAL</p><h2>Mis <span>confesiones ♡</span></h2></div>
          <button className="button button--primary" onClick={() => navigate('/crear')}>Nueva confesión</button>
        </section>
        <div className="feed-list" style={{ marginTop: '16px' }}>
          {loading && <div className="glass-card empty-state">Cargando tus confesiones…</div>}
          {!loading && error && <div className="glass-card empty-state">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="glass-card empty-state">Todavía no has publicado confesiones.</div>}
          {items.map((item) => <PublicConfessionCard key={item.id} item={item} onDelete={remove} />)}
        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}
