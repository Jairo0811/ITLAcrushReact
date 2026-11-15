import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeFavoriteConfessions, subscribeSavedConfessions, toggleReaction, toggleSaved } from '../services/socialService.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { PublicConfessionCard } from '../components/ConfessionCard.jsx'
import { SkipLink } from '../components/ui.jsx'
import { useSocialPreferences } from '../hooks/useSocialPreferences.js'

export default function SocialCollectionPage({ mode }) {
  const { user, profile } = useAuth()
  const { likedIds, savedIds } = useSocialPreferences(user?.uid)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isFavorites = mode === 'favorites'

  useEffect(() => {
    if (!user) return undefined
    const subscribe = isFavorites ? subscribeFavoriteConfessions : subscribeSavedConfessions
    return subscribe(
      user.uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (subscriptionError) => {
        console.error('No se pudo cargar la colección social.', subscriptionError)
        setError(isFavorites ? 'No pudimos cargar tus favoritos.' : 'No pudimos cargar tus guardados.')
        setLoading(false)
      },
    )
  }, [isFavorites, user])

  const handleToggleLike = (confessionId) => toggleReaction({ confessionId, user, profile })
  const handleToggleSave = (confessionId) => toggleSaved({ uid: user.uid, confessionId })

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Confesiones guardadas y favoritas</h1>
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">{isFavorites ? 'TUS REACCIONES' : 'TU COLECCIÓN'}</p>
            <h2>{isFavorites ? <>Tus <span>favoritos ♡</span></> : <>Confesiones <span>guardadas ♡</span></>}</h2>
            <p>{isFavorites ? 'Publicaciones a las que has reaccionado.' : 'Publicaciones que guardaste para volver a leerlas después.'}</p>
          </div>
          <div className="dashboard-hero__note">{isFavorites ? 'ME GUSTA' : 'GUARDADOS'}<br/>PERSONALES</div>
        </section>

        <div className="feed-list social-collection-list">
          {loading && <div className="glass-card empty-state" role="status">Cargando…</div>}
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="glass-card empty-state">{isFavorites ? 'Todavía no tienes confesiones favoritas.' : 'Todavía no has guardado ninguna confesión.'}</div>}
          {items.map((item) => (
            <PublicConfessionCard
              key={item.id}
              item={item}
              socialEnabled
              isLiked={likedIds.has(item.id)}
              isSaved={savedIds.has(item.id)}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      </main>
      <AppMobileNav />
    </div>
  )
}
