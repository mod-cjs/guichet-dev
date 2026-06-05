'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState, SkeletonCard } from '@/components/ui'
import { OppCard } from '@/components/opportunites/OppCard'
import type { OpportuniteListItem } from '@/types/opportunite'

/** Liste des opportunités sauvegardées par le jeune connecté (GUIC-20). */
export function MesFavoris() {
  const router = useRouter()
  const [items, setItems] = useState<OpportuniteListItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/favoris')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((b) => setItems(b.data ?? []))
      .catch(() => setError(true))
  }, [])

  /** Retrait d'un favori — optimiste, rollback si l'API échoue. */
  const remove = useCallback((id: string) => {
    setItems((prev) => prev?.filter((o) => o.id !== id) ?? prev)
    fetch(`/api/favoris/${id}`, { method: 'DELETE' }).then((r) => {
      if (!r.ok) {
        // Échec : on recharge pour refléter l'état réel du serveur.
        fetch('/api/favoris')
          .then((res) => (res.ok ? res.json() : null))
          .then((b) => b?.data && setItems(b.data))
          .catch(() => {})
      }
    })
  }, [])

  if (error) {
    return (
      <div className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-4 text-fs-300">
        Impossible de charger vos favoris. Réessayez plus tard.
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
        title="Aucune opportunité sauvegardée"
        description="Touchez le cœur sur une opportunité pour la retrouver ici."
        actionLabel="Voir les opportunités"
        onAction={() => router.push('/opportunites')}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-3">
      {items.map((item) => (
        <OppCard key={item.id} item={item} isFavori onToggleFavori={remove} />
      ))}
    </div>
  )
}
