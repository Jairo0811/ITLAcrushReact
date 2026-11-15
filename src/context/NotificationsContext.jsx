import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadSocialNotifications } from '../services/socialService.js'
import { countUnread } from '../utils/groupNotifications.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)

// Costo de lecturas: cada carga consulta la actividad de tus confesiones más recientes. Por eso
// solo se refresca en segundo plano cada 5 minutos y únicamente con la pestaña visible.
const POLL_MS = 5 * 60 * 1000
const STALE_MS = 60 * 1000

const seenKey = (uid) => `itla-crush:notifications-seen:${uid}`

function readSeenAt(uid) {
  try {
    return Number(window.localStorage.getItem(seenKey(uid))) || 0
  } catch {
    return 0
  }
}

const EMPTY = { uid: null, items: [], error: '', loadedAt: 0, loadedKey: null }

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [data, setData] = useState(EMPTY)
  const [reloadKey, setReloadKey] = useState(0)
  const [seen, setSeen] = useState({ uid: null, at: 0 })
  const loadedAtRef = useRef(0)

  const current = data.uid === uid ? data : { ...EMPTY, uid }
  const lastSeenAt = seen.uid === uid ? seen.at : (uid ? readSeenAt(uid) : 0)

  useEffect(() => {
    loadedAtRef.current = current.loadedAt
  })

  useEffect(() => {
    if (!uid) return undefined
    let active = true

    loadSocialNotifications(uid)
      .then((items) => {
        if (active) setData({ uid, items, error: '', loadedAt: Date.now(), loadedKey: reloadKey })
      })
      .catch((loadError) => {
        console.error('No se pudieron cargar las notificaciones.', loadError)
        if (!active) return
        setData((previous) => ({
          uid,
          items: previous.uid === uid ? previous.items : [],
          error: 'No pudimos cargar tus notificaciones.',
          loadedAt: previous.uid === uid ? previous.loadedAt : 0,
          loadedKey: reloadKey,
        }))
      })

    return () => { active = false }
  }, [uid, reloadKey])

  useEffect(() => {
    if (!uid) return undefined
    const refreshIfStale = (maxAge) => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - loadedAtRef.current >= maxAge) setReloadKey((key) => key + 1)
    }
    const timer = window.setInterval(() => refreshIfStale(POLL_MS), POLL_MS)
    const onVisible = () => refreshIfStale(STALE_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  const markAllSeen = useCallback(() => {
    if (!uid) return
    const at = Date.now()
    setSeen({ uid, at })
    try {
      window.localStorage.setItem(seenKey(uid), String(at))
    } catch {
      // Sin almacenamiento: el contador se reinicia al recargar.
    }
  }, [uid])

  const value = useMemo(() => ({
    items: current.items,
    error: current.error,
    loadedAt: current.loadedAt,
    loading: Boolean(uid) && current.loadedKey === null,
    refreshing: Boolean(uid) && current.loadedKey !== null && current.loadedKey !== reloadKey,
    lastSeenAt,
    unreadCount: countUnread(current.items, lastSeenAt),
    refresh,
    markAllSeen,
  }), [current.items, current.error, current.loadedAt, current.loadedKey, uid, reloadKey, lastSeenAt, refresh, markAllSeen])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

const NO_NOTIFICATIONS = {
  items: [], error: '', loadedAt: 0, loading: false, refreshing: false, lastSeenAt: 0, unreadCount: 0,
  refresh: () => {}, markAllSeen: () => {},
}

// El hook comparte módulo con el proveedor para usar la misma instancia de contexto.
// Fuera del proveedor (p. ej. en la demo pública) devuelve un estado vacío.
// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationsContext) ?? NO_NOTIFICATIONS
}
