'use client'

import { useEffect, useState } from 'react'

/**
 * useOnlineStatus — GUIC-689 (Lot D — états système, D1 mode hors-ligne).
 *
 * Suit l'état réseau du navigateur via `navigator.onLine` + les événements
 * `online`/`offline`. Le public cible (jeune, mobile, réseau intermittent)
 * dépend de ce signal pour afficher le bandeau hors-ligne : ce n'est pas une
 * décoration, c'est une fonctionnalité de robustesse.
 *
 * SSR-safe : `navigator` n'est jamais lu pendant le rendu (ni côté serveur,
 * ni au premier rendu client) — seulement dans un effet, après montage. Le
 * rendu initial (serveur et client) suppose donc toujours "en ligne", puis
 * l'état réel est appliqué immédiatement après le montage, sans lecture de
 * `window`/`navigator` qui casserait l'hydratation.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
