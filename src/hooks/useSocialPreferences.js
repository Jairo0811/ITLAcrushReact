import { useEffect, useState } from 'react'
import { subscribeMyReactionIds, subscribeSavedConfessionIds } from '../services/socialService.js'

export function useSocialPreferences(uid) {
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [savedIds, setSavedIds] = useState(() => new Set())

  useEffect(() => {
    if (!uid) return undefined
    const unsubscribeLikes = subscribeMyReactionIds(
      uid,
      setLikedIds,
      (error) => console.error('No se pudieron cargar tus favoritos.', error),
    )
    const unsubscribeSaved = subscribeSavedConfessionIds(
      uid,
      setSavedIds,
      (error) => console.error('No se pudieron cargar tus guardados.', error),
    )
    return () => {
      unsubscribeLikes()
      unsubscribeSaved()
    }
  }, [uid])

  return { likedIds, savedIds }
}
