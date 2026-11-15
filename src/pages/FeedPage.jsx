import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { getProgram } from '../data/itlaPrograms.js'
import { buildProgramFilters, buildTrendingTopics, filterConfessions, TRENDING_WINDOW_DAYS } from '../utils/feedFilters.js'
import { buildCommunityTopics } from '../data/communityTopics.js'
import { hideConfession, reportConfession, subscribeHiddenConfessionIds } from '../services/trustSafetyService.js'
import { toggleReaction, toggleSaved } from '../services/socialService.js'
import AppMobileNav from '../components/AppMobileNav.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import { PublicConfessionCard } from '../components/ConfessionCard.jsx'
import { Icon, NotificationBadge, SkipLink } from '../components/ui.jsx'
import { useDismissibleFlag } from '../hooks/useDismissibleFlag.js'
import { usePublicConfessions } from '../hooks/usePublicConfessions.js'
import { useSocialPreferences } from '../hooks/useSocialPreferences.js'

export default function FeedPage() {
  const [searchText, setSearchText] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [tab, setTab] = useState('recent')
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [safetyError, setSafetyError] = useState('')
  const { items: publicConfessions, loading, error, hasMore, loadingMore, loadMore } = usePublicConfessions()
  const { user, profile } = useAuth()
  const { unreadCount } = useNotifications()
  const { likedIds, savedIds } = useSocialPreferences(user?.uid)
  const location = useLocation()
  const name = profile?.displayName || user?.displayName || 'Estudiante'
  const initial = name.charAt(0).toUpperCase()
  const programInfo = getProgram(profile?.program)
  const hasFeedFilters = Boolean(searchText.trim() || selectedTopic || selectedProgram)
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

  const programFilters = useMemo(() => buildProgramFilters(publicConfessions), [publicConfessions])
  const trending = useMemo(() => buildTrendingTopics(publicConfessions), [publicConfessions])
  const selectedProgramInfo = getProgram(selectedProgram)

  const visibleConfessions = useMemo(
    () => filterConfessions(publicConfessions, { hiddenIds, searchText, topic: selectedTopic, program: selectedProgram }),
    [hiddenIds, publicConfessions, searchText, selectedTopic, selectedProgram],
  )

  const chooseTopic = (topic) => {
    setSelectedTopic(topic)
    setTab('recent')
  }

  const clearFilters = () => {
    setSearchText('')
    setSelectedTopic('')
    setSelectedProgram('')
  }

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
            <Link to="/notificaciones" className="topbar-icon-link"><Icon name="bell" regular /><span className="sr-only">Notificaciones</span><NotificationBadge count={unreadCount} /></Link>
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
                  <ol className="onboarding-steps" aria-label="Primeros pasos">
                    <li className={programInfo ? 'onboarding-steps__item onboarding-steps__item--done' : 'onboarding-steps__item'}>
                      <Icon name={programInfo ? 'circle-check' : 'graduation-cap'} />
                      {programInfo ? <span>Tecnólogo elegido: {programInfo.label}</span> : <Link to="/perfil">Elige tu tecnólogo en tu perfil</Link>}
                    </li>
                    <li className="onboarding-steps__item"><Icon name="user-shield" /><Link to="/normas">Lee las normas de la comunidad</Link></li>
                    <li className="onboarding-steps__item"><Icon name="heart" /><Link to="/crear">Publica tu primera confesión</Link></li>
                  </ol>
                </div>
              </section>
            )}

            <Link className="quick-compose glass-card" to="/crear">
              <div className="avatar" aria-hidden="true">{initial}</div>
              <span>¿Qué quieres confesar hoy?</span>
              <span className="button button--primary">Publicar</span>
            </Link>

            <div className="feed-tabs" role="group" aria-label="Orden del feed">
              <button type="button" className={tab === 'recent' ? 'active' : ''} aria-pressed={tab === 'recent'} onClick={() => setTab('recent')}>Más recientes</button>
              <button type="button" className={tab === 'trending' ? 'active' : ''} aria-pressed={tab === 'trending'} onClick={() => setTab('trending')}>Tendencias</button>
            </div>
            {tab === 'recent' && programFilters.length > 0 && (
              <div className="program-filter" role="group" aria-label="Filtrar por tecnólogo">
                <button type="button" className={!selectedProgram ? 'program-chip program-chip--active' : 'program-chip'} aria-pressed={!selectedProgram} onClick={() => setSelectedProgram('')}>Todos</button>
                {programFilters.map((entry) => (
                  <button
                    type="button"
                    key={entry.value}
                    className={selectedProgram === entry.value ? 'program-chip program-chip--active' : 'program-chip'}
                    style={{ '--program-color': entry.color }}
                    aria-pressed={selectedProgram === entry.value}
                    onClick={() => setSelectedProgram(selectedProgram === entry.value ? '' : entry.value)}
                  >
                    {entry.label} <small>{entry.count}</small>
                  </button>
                ))}
              </div>
            )}
            {tab === 'recent' && (selectedTopic || selectedProgram) && (
              <div className="active-topic-filter" role="status">
                <span>
                  Mostrando
                  {selectedTopic && <> tema <strong>{selectedTopic}</strong></>}
                  {selectedTopic && selectedProgram && ' en'}
                  {selectedProgramInfo && <> <strong>{selectedProgramInfo.label}</strong></>}
                </span>
                <button type="button" onClick={() => { setSelectedTopic(''); setSelectedProgram('') }} aria-label="Quitar filtros">
                  <Icon name="xmark" /> Quitar filtro
                </button>
              </div>
            )}
            {tab === 'trending' && (
              <section className="glass-card trending-panel" aria-label="Tendencias">
                <h2>Temas del momento</h2>
                <p>{trending.usedWindow ? `Hashtags más usados en los últimos ${TRENDING_WINDOW_DAYS} días.` : 'Todavía hay pocas publicaciones recientes; mostramos los hashtags más usados.'}</p>
                {trending.topics.length === 0 ? (
                  <div className="topics-empty">
                    <Icon name="hashtag" />
                    <p>Aún no hay temas en tendencia.</p>
                    <Link to="/crear">Crear una confesión con tema <Icon name="arrow-right" /></Link>
                  </div>
                ) : (
                  <ol className="trending-list">
                    {trending.topics.map((topic, index) => (
                      <li key={topic.tag}>
                        <button type="button" className="trend-row" onClick={() => chooseTopic(topic.tag)}>
                          <b>{index + 1}</b>
                          <span><strong>{topic.tag}</strong><small>{topic.description}</small></span>
                          <em>{topic.count}</em>
                          <span className="sr-only"> publicaciones. Ver publicaciones de este tema</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
            <div className="feed-list" hidden={tab === 'trending'}>
              {safetyError && <div className="auth-message auth-message--error" role="alert">{safetyError}</div>}
              {loading && <div className="glass-card empty-state" role="status" aria-live="polite">Cargando confesiones…</div>}
              {!loading && error && <div className="glass-card empty-state" role="alert">{error}</div>}
              {!loading && !error && visibleConfessions.length === 0 && (
                <div className="glass-card empty-state empty-state--actionable">
                  <span className="empty-state__icon"><Icon name={hasFeedFilters ? 'magnifying-glass' : 'comment-dots'} regular /></span>
                  <div>
                    <strong>{hasFeedFilters ? 'No encontramos coincidencias' : 'Todavía no hay confesiones públicas'}</strong>
                    <p>{selectedTopic || selectedProgram ? 'No hay publicaciones visibles con esos filtros. Las anónimas no muestran tecnólogo.' : searchText.trim() ? 'Prueba con otro texto o hashtag.' : 'La comunidad se verá aquí cuando llegue la primera publicación.'}</p>
                  </div>
                  {hasFeedFilters
                    ? <button type="button" className="button button--soft" onClick={clearFilters}>Limpiar filtros</button>
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
                  onSelectTag={chooseTopic}
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
                    onClick={() => chooseTopic(topic.tag)}
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
