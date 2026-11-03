import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getProgram } from '../data/itlaPrograms.js'
import { buildCommunityTopics } from '../data/communityTopics.js'
import { hideConfession, reportConfession, subscribeHiddenConfessionIds } from '../services/trustSafetyService.js'
import { toggleReaction, toggleSaved } from '../services/socialService.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { PublicConfessionCard } from '../components/ConfessionCard.jsx'
import { Icon, SkipLink } from '../components/ui.jsx'
import { useDismissibleFlag } from '../hooks/useDismissibleFlag.js'
import { usePublicConfessions } from '../hooks/usePublicConfessions.js'
import { useSocialPreferences } from '../hooks/useSocialPreferences.js'

export default function FeedPage() {
  const [searchText, setSearchText] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [safetyError, setSafetyError] = useState('')
  const { items: publicConfessions, loading, error, hasMore, loadingMore, loadMore } = usePublicConfessions()
  const { user, profile } = useAuth()
  const { likedIds, savedIds } = useSocialPreferences(user?.uid)
  const location = useLocation()
  const name = profile?.displayName || user?.displayName || 'Estudiante'
  const initial = name.charAt(0).toUpperCase()
  const programInfo = getProgram(profile?.program)
  const hasFeedFilters = Boolean(searchText.trim() || selectedTopic)
  const [welcomeDismissed, dismissWelcome] = useDismissibleFlag('itla-crush:welcome-dismissed')

  useEffect(() => {
    if (!user) return undefined
    return subscribeHiddenConfessionIds(
      user.uid,
      setHiddenIds,
      (hiddenError) => console.error('No se pudieron cargar las publicaciones ocultas.', hiddenError),
    )
  }, [user])

  const communityTopics = useMemo(
    () => buildCommunityTopics(publicConfessions),
    [publicConfessions],
  )

  const visibleConfessions = useMemo(() => {
    const normalized = searchText.trim().toLocaleLowerCase('es')
    const normalizedTopic = selectedTopic.toLocaleLowerCase('es')
    const available = publicConfessions.filter((item) => !hiddenIds.has(item.id))

    return available.filter((item) => {
      const matchesTopic = !normalizedTopic
        || (item.tags ?? []).some((tag) => tag.toLocaleLowerCase('es') === normalizedTopic)

      if (!matchesTopic) return false
      if (!normalized) return true

      return `${item.text} ${item.recipientText || ''} ${(item.tags ?? []).join(' ')}`
        .toLocaleLowerCase('es')
        .includes(normalized)
    })
  }, [hiddenIds, publicConfessions, searchText, selectedTopic])

  useEffect(() => {
    const confessionId = new URLSearchParams(location.search).get('confession')
    if (!confessionId || visibleConfessions.length === 0) return
    const target = document.getElementById(`confession-${confessionId}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [location.search, visibleConfessions.length])

  const handleHide = async (confessionId) => {
    setSafetyError('')
    try {
      await hideConfession({ confessionId, ownerUid: user.uid })
      setHiddenIds((current) => new Set([...current, confessionId]))
    } catch (hideError) {
      setSafetyError(hideError.message || 'No pudimos ocultar esa publicación.')
    }
  }

  const handleReport = async (confessionId, reason, details) => {
    setSafetyError('')
    await reportConfession({ confessionId, reporterUid: user.uid, reason, details })
    await hideConfession({ confessionId, ownerUid: user.uid })
    setHiddenIds((current) => new Set([...current, confessionId]))
  }

  const handleToggleLike = (confessionId) => toggleReaction({
    confessionId,
    user,
    profile,
  })

  const handleToggleSave = (confessionId) => toggleSaved({
    uid: user.uid,
    confessionId,
  })

  return (
    <div className="app-layout page-shell">
      <SkipLink />
      <AppSidebar />
      <main id="main-content" className="app-main" tabIndex="-1">
        <h1 className="sr-only">Feed de confesiones</h1>
        <header className="app-topbar glass-card">
          <label className="app-search">
            <span><Icon name="magnifying-glass" /></span>
            <span className="sr-only">Buscar confesiones o hashtags</span>
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar confesiones o #hashtags…" />
          </label>
          <div className="topbar-actions">
            <Link to="/notificaciones" className="topbar-icon-link" aria-label="Notificaciones"><Icon name="bell" regular /></Link>
            <Link to="/perfil" className="mini-profile">
              <div className="avatar">{initial}</div>
              <span>
                <strong>{name}</strong>
                <small>{programInfo?.label || 'Cuenta autenticada'}</small>
              </span>
            </Link>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="feed-column">
            {!welcomeDismissed && (
              <section className="dashboard-hero dashboard-hero--feed glass-card" aria-label="Bienvenida">
                <button type="button" className="dashboard-hero__close" onClick={dismissWelcome} aria-label="Cerrar bienvenida">
                  <Icon name="xmark" />
                </button>
                <div className="dashboard-hero__copy">
                  <p className="eyebrow">TU COMUNIDAD ITLA</p>
                  <h2>Confiesa lo que sientes. <span>Conecta con lo real.</span></h2>
                  <p>Publica con tu identidad o en modo anónimo, descubre temas de la comunidad y conserva el control de tu privacidad.</p>
                  <div className="dashboard-hero__meta">
                    <span><Icon name="user-shield" /> Privacidad por publicación</span>
                    {programInfo && <span style={{ '--program-color': programInfo.color }}><Icon name="graduation-cap" /> {programInfo.label}</span>}
                  </div>
                </div>
              </section>
            )}

            <Link className="quick-compose glass-card" to="/crear">
              <div className="avatar" aria-hidden="true">{initial}</div>
              <span>¿Qué quieres confesar hoy?</span>
              <span className="button button--primary">Publicar</span>
            </Link>

            <div className="feed-tabs"><h2 className="feed-tabs__label">Más recientes</h2></div>
            {selectedTopic && (
              <div className="active-topic-filter" role="status">
                <span>Mostrando tema <strong>{selectedTopic}</strong></span>
                <button type="button" onClick={() => setSelectedTopic('')} aria-label={`Quitar filtro ${selectedTopic}`}>
                  <Icon name="xmark" /> Quitar filtro
                </button>
              </div>
            )}
            <div className="feed-list">
              {safetyError && <div className="auth-message auth-message--error" role="alert">{safetyError}</div>}
              {loading && <div className="glass-card empty-state" role="status" aria-live="polite">Cargando confesiones…</div>}
              {!loading && error && <div className="glass-card empty-state" role="alert">{error}</div>}
              {!loading && !error && visibleConfessions.length === 0 && (
                <div className="glass-card empty-state empty-state--actionable">
                  <span className="empty-state__icon"><Icon name={hasFeedFilters ? 'magnifying-glass' : 'comment-dots'} regular /></span>
                  <div>
                    <strong>{hasFeedFilters ? 'No encontramos coincidencias' : 'Todavía no hay confesiones públicas'}</strong>
                    <p>{selectedTopic ? `No hay publicaciones visibles en ${selectedTopic}.` : searchText.trim() ? 'Prueba con otro texto o hashtag.' : 'La comunidad se verá aquí cuando llegue la primera publicación.'}</p>
                  </div>
                  {hasFeedFilters
                    ? <button type="button" className="button button--soft" onClick={() => { setSearchText(''); setSelectedTopic('') }}>Limpiar filtros</button>
                    : <Link className="button button--primary" to="/crear">Publicar la primera</Link>}
                </div>
              )}
              {visibleConfessions.map((item) => (
                <PublicConfessionCard
                  item={item}
                  key={item.id}
                  socialEnabled
                  isLiked={likedIds.has(item.id)}
                  isSaved={savedIds.has(item.id)}
                  onToggleLike={handleToggleLike}
                  onToggleSave={handleToggleSave}
                  onHide={handleHide}
                  onReport={handleReport}
                  onSelectTag={setSelectedTopic}
                />
              ))}
              {hasMore && (
                <button type="button" className="button button--soft feed-load-more" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Cargando…' : 'Cargar más confesiones'}
                </button>
              )}
            </div>
          </div>

          <aside className="right-rail">
            <section className="glass-card rail-card community-topics-card">
              <div className="rail-title"><h3>🔥 Temas de la comunidad</h3></div>
              {communityTopics.length === 0 ? (
                <div className="topics-empty">
                  <Icon name="hashtag" />
                  <p>Aún no hay temas activos.</p>
                  <small>Los temas nacen de hashtags reales usados por la comunidad.</small>
                  <Link to="/crear">Crear una confesión con tema <Icon name="arrow-right" /></Link>
                </div>
              ) : (
                communityTopics.map((topic, index) => (
                  <button
                    type="button"
                    className={selectedTopic.toLocaleLowerCase('es') === topic.tag.toLocaleLowerCase('es') ? 'trend-row trend-row--active' : 'trend-row'}
                    key={topic.tag}
                    onClick={() => setSelectedTopic(topic.tag)}
                    aria-pressed={selectedTopic.toLocaleLowerCase('es') === topic.tag.toLocaleLowerCase('es')}
                  >
                    <b>{index + 1}</b>
                    <span>
                      <strong>{topic.tag}</strong>
                      <small>{topic.description}</small>
                    </span>
                    <em>{topic.count}</em>
                  </button>
                ))
              )}
            </section>
            <section className="glass-card rail-card"><div className="rail-title"><h3>Acciones rápidas</h3></div><div className="quick-grid"><Link to="/crear"><Icon name="heart" /><span>Nueva confesión</span></Link><Link to="/notificaciones"><Icon name="bell" regular /><span>Notificaciones</span></Link><Link to="/guardados"><Icon name="bookmark" regular /><span>Guardados</span></Link><Link to="/favoritos"><Icon name="heart" regular /><span>Favoritos</span></Link></div></section>
          </aside>
        </section>
      </main>
      <AppMobileNav />
    </div>
  )
}
