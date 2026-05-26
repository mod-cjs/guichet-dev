'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge, Card, EmptyState, SkeletonCard } from '@/components/ui'
import type { CandidatureListItem } from '@/types/candidature'

type StatutCandidature = CandidatureListItem['statut']

const STATUT_BADGE: Record<StatutCandidature, 'grey' | 'blue' | 'green' | 'red'> = {
  En_attente: 'grey',
  Vue: 'blue',
  Retenue: 'green',
  Refusee: 'red',
}
const STATUT_LABEL: Record<StatutCandidature, string> = {
  En_attente: 'En attente',
  Vue: 'Vue par le recruteur',
  Retenue: 'Retenue',
  Refusee: 'Non retenue',
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Liste de suivi des candidatures du jeune connecté (GUIC-21). */
export function MesCandidatures() {
  const [items, setItems] = useState<CandidatureListItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/candidatures')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((b) => setItems(b.data ?? []))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-4 text-fs-300">
        Impossible de charger vos candidatures. Réessayez plus tard.
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="flex flex-col gap-space-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Pas encore de candidature"
        description="Explorez les opportunités et postulez à celles qui vous correspondent."
        actionLabel="Voir les opportunités"
        onAction={() => {
          window.location.href = '/opportunites'
        }}
      />
    )
  }

  return (
    <ul className="flex flex-col gap-space-2">
      {items.map((c) => (
        <li key={c.id}>
          <Card className="flex items-start justify-between gap-space-3">
            <div className="min-w-0">
              <Link
                href={`/opportunites/${c.opportuniteSlug}`}
                className="text-fs-400 font-bold text-color-text-primary hover:underline"
              >
                {c.opportuniteTitre}
              </Link>
              <p className="text-fs-200 text-color-text-secondary mt-[2px]">{c.organisation}</p>
              <p className="text-fs-100 text-color-text-muted mt-space-1">
                Envoyée le {dateFmt.format(new Date(c.soumiseA))}
              </p>
            </div>
            <Badge variant={STATUT_BADGE[c.statut]}>{STATUT_LABEL[c.statut]}</Badge>
          </Card>
        </li>
      ))}
    </ul>
  )
}
