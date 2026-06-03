'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TypeOpportunite } from '@prisma/client'
import { EmptyState, SkeletonCard } from '@/components/ui'
import { OppCard } from '@/components/opportunites/OppCard'
import { typeLabel } from '@/components/opportunites/OpportuniteTypeChip'
import type { OpportuniteListItem } from '@/types/opportunite'

/**
 * Liste des opportunités sauvegardées par le jeune connecté (GUIC-20 / GUIC-191).
 *
 * Refonte Phase 2B-5 :
 * - utilise `<OppCard>` v2 (design lot3-opps-mobile · MobileOppRowCard)
 * - filtres par type d'opportunité en chips horizontaux (mobile-first)
 * - grille single column mobile, 2 colonnes desktop
 * - état vide : `<EmptyState icon="bookmark" />` + CTA "Voir les opportunités"
 * - état loading : 4 skeleton cards
 */

const TYPE_CHIPS: TypeOpportunite[] = [
  'Emploi',
  'Stage',
  'Formation',
  'Bourse',
  'Volontariat',
  'Appel_a_projets',
]

export function MesFavoris() {
  const [items, setItems] = useState<OpportuniteListItem[] | null>(null)
  const [error, setError] = useState(false)
  const [activeType, setActiveType] = useState<TypeOpportunite | null>(null)

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
        fetch('/api/favoris')
          .then((res) => (res.ok ? res.json() : null))
          .then((b) => b?.data && setItems(b.data))
          .catch(() => {})
      }
    })
  }, [])

  /** Filtre la liste selon le type sélectionné — mémorisé pour éviter re-renders inutiles. */
  const filtered = useMemo(() => {
    if (!items) return null
    if (!activeType) return items
    return items.filter((o) => o.type === activeType)
  }, [items, activeType])

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
        icon="bookmark"
        title="Aucun favori"
        description="Touchez l'icône favori sur une opportunité pour la retrouver ici."
        actionLabel="Voir les opportunités"
        onAction={() => {
          window.location.href = '/opportunites'
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-3">
      {/* Rangée horizontale de chips types — filtre rapide local. */}
      <div
        className="-mx-space-3 px-space-3 flex gap-space-1 overflow-x-auto
          snap-x snap-mandatory scrollbar-none"
        role="tablist"
        aria-label="Filtrer les favoris par type"
        data-testid="favoris-type-chips"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeType === null}
          onClick={() => setActiveType(null)}
          className={[
            'snap-start shrink-0 inline-flex items-center px-space-3 py-[7px] rounded-gj-pill',
            'text-fs-200 leading-none whitespace-nowrap border-[1.5px] min-h-[36px]',
            'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
            activeType === null
              ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep font-black'
              : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong font-semibold',
          ].join(' ')}
        >
          Tous
        </button>
        {TYPE_CHIPS.map((t) => {
          const active = activeType === t
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveType(active ? null : t)}
              className={[
                'snap-start shrink-0 inline-flex items-center px-space-3 py-[7px] rounded-gj-pill',
                'text-fs-200 leading-none whitespace-nowrap border-[1.5px] min-h-[36px]',
                'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
                active
                  ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep font-black'
                  : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong font-semibold',
              ].join(' ')}
            >
              {typeLabel(t)}
            </button>
          )
        })}
      </div>

      {filtered && filtered.length === 0 ? (
        <EmptyState
          icon="filter"
          title="Aucun favori dans cette catégorie"
          description="Ajustez le filtre pour voir les autres opportunités sauvegardées."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-3">
          {filtered?.map((item) => (
            <OppCard key={item.id} item={item} isFavori onToggleFavori={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
