import { useCallback, useEffect, useState } from 'react'
import { FEED_MAX_ITEMS, FEED_PAGE_SIZE, subscribePublicConfessions } from '../services/confessionService.js'
import { isFirebaseConfigured } from '../services/firebase.js'

export function usePublicConfessions({ pageSize = FEED_PAGE_SIZE } = {}) {
  const [limitCount, setLimitCount] = useState(pageSize)
  const [loadedLimit, setLoadedLimit] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState(
    isFirebaseConfigured ? '' : 'Firebase no está configurado en este equipo. Revisa tu archivo .env.',
  )

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    const unsubscribe = subscribePublicConfessions(
      (nextItems) => {
        setItems(nextItems)
        setLoadedLimit(limitCount)
        setLoading(false)
        setError('')
      },
      (snapshotError) => {
        console.error('No se pudo cargar el feed de confesiones.', snapshotError)
        setError('No pudimos cargar las confesiones en este momento.')
        setLoading(false)
      },
      limitCount,
    )

    return unsubscribe
  }, [limitCount])

  const loadMore = useCallback(
    () => setLimitCount((current) => Math.min(current + pageSize, FEED_MAX_ITEMS)),
    [pageSize],
  )

  return {
    items,
    loading,
    error,
    // Si la última carga llenó la página completa, es posible que existan más publicaciones.
    hasMore: !loading && loadedLimit > 0 && items.length >= loadedLimit && loadedLimit < FEED_MAX_ITEMS,
    loadingMore: !loading && loadedLimit !== limitCount,
    loadMore,
  }
}
