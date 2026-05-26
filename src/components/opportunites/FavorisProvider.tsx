'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { Toast } from '@/components/ui'

interface FavorisContextValue {
  /** L'opportunité est-elle en favori ? */
  has: (opportuniteId: string) => boolean
  /** Bascule le favori (optimiste) ; gère le cas non-connecté. */
  toggle: (opportuniteId: string) => void
  isAuthenticated: boolean
}

const FavorisContext = createContext<FavorisContextValue | null>(null)

export function useFavoris(): FavorisContextValue {
  const ctx = useContext(FavorisContext)
  if (!ctx) throw new Error('useFavoris doit être utilisé dans un <FavorisProvider>')
  return ctx
}

/**
 * Source unique de l'état des favoris (GUIC-20) — placé dans le layout
 * `opportunites/` pour couvrir la liste, le détail page et le slide-over
 * intercepté. Évite toute désynchronisation entre carte et détail.
 */
export function FavorisProvider({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean
  children: ReactNode
}) {
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null,
  )

  // Set complet des favoris (non paginé) chargé une fois.
  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/favoris/ids')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (Array.isArray(body?.data)) setFavSet(new Set(body.data))
      })
      .catch(() => {})
  }, [isAuthenticated])

  const has = useCallback((id: string) => favSet.has(id), [favSet])

  const toggle = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        setToast({ message: 'Connectez-vous pour sauvegarder', type: 'info' })
        return
      }
      const wasFavori = favSet.has(id)
      setFavSet((prev) => {
        const next = new Set(prev)
        if (wasFavori) next.delete(id)
        else next.add(id)
        return next
      })

      const request = wasFavori
        ? fetch(`/api/favoris/${id}`, { method: 'DELETE' })
        : fetch('/api/favoris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opportuniteId: id }),
          })

      request
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        })
        .catch(() => {
          // Rollback optimiste.
          setFavSet((prev) => {
            const next = new Set(prev)
            if (wasFavori) next.add(id)
            else next.delete(id)
            return next
          })
          setToast({ message: 'Action impossible, réessayez', type: 'error' })
        })
    },
    [isAuthenticated, favSet],
  )

  return (
    <FavorisContext.Provider value={{ has, toggle, isAuthenticated }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </FavorisContext.Provider>
  )
}
