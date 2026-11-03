import { useCallback, useState } from 'react'

/** Recuerda en este navegador que el usuario ya cerró un aviso (p. ej. la bienvenida). */
export function useDismissibleFlag(key) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem(key, '1')
    } catch {
      // Sin almacenamiento disponible: el aviso solo se oculta en esta sesión.
    }
  }, [key])

  return [dismissed, dismiss]
}
