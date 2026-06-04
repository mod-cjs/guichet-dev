'use client'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState, SkeletonCard } from '@/components/ui'
import { ResourceCard } from '@/components/ressources/ResourceCard'
import type { RessourceListItem } from '@/lib/loaders/ressources'

/**
 * Liste des ressources favorites du jeune connecté (GUIC-24).
 * Page enfant `/jeune/mes-favoris/ressources` — séparée du composant
 * `MesFavoris` (opportunités) pour éviter le conflit avec la PR GUIC-191
 * en cours de refonte. Un toggle global sera ajouté dans une PR suite.
 */
export function MesRessourcesFavorites() {
  const [items, setItems] = useState<RessourceListItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/favoris/ressources', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((b) => setItems(b.data ?? []))
      .catch(() => setError(true))
  }, [])

  /** Retrait optimiste, rollback en cas d'échec serveur. */
  const remove = useCallback((id: string) => {
    setItems((prev) => prev?.filter((r) => r.id !== id) ?? prev)
    fetch(`/api/ressources/${id}/favori`, {
      method: 'POST',
      credentials: 'include',
    }).then((r) => {
      // Le toggle renvoie favori:true s'il a recréé un favori — dans ce cas
      // on recharge pour refléter l'état réel.
      if (!r.ok) {
        fetch('/api/favoris/ressources', { credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((b) => b?.data && setItems(b.data))
          .catch(() => {})
      }
    })
  }, [])

  if (error) {
    return (
      <div className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-4 text-fs-300">
        Impossible de charger vos ressources favorites. Réessayez plus tard.
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="📚"
        title="Aucune ressource favorite"
        description="Touchez le bookmark sur une ressource pour la retrouver ici."
        actionLabel="Voir la bibliothèque"
        onAction={() => {
          window.location.href = '/ressources'
        }}
      />
    )
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-3 list-none p-0 m-0">
      {items.map((r) => (
        <li key={r.id}>
          <ResourceCard item={r} isFavori onToggleFavori={remove} />
        </li>
      ))}
    </ul>
  )
}
