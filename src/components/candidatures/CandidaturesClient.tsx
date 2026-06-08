'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/ui'
import { CandidatureCard } from './CandidatureCard'
import { CandidaturesFilterChips } from './CandidaturesFilterChips'
import type { CandidatureFilter, CandidatureMock, PipelineStep } from './types'

const STEPS: PipelineStep[] = ['Brouillon', 'Envoyee', 'EnRevue', 'Entretien', 'Decision']

export interface CandidaturesClientProps {
  items: CandidatureMock[]
}

function computeCounts(items: CandidatureMock[]): Record<CandidatureFilter, number> {
  const base: Record<CandidatureFilter, number> = {
    all: items.length,
    Brouillon: 0,
    Envoyee: 0,
    EnRevue: 0,
    Entretien: 0,
    Decision: 0,
  }
  for (const item of items) base[item.currentStep] += 1
  return base
}

/**
 * Pipeline candidatures côté client (GUIC-190).
 *
 * Gère :
 * - état de filtre (chips)
 * - compteur en header
 * - liste filtrée OR empty state
 */
export function CandidaturesClient({ items }: CandidaturesClientProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<CandidatureFilter>('all')

  const counts = useMemo(() => computeCounts(items), [items])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.currentStep === filter)),
    [items, filter],
  )

  return (
    <div className="flex flex-col gap-space-3">
      <p
        className="text-fs-200 font-bold uppercase tracking-[0.04em] text-color-text-muted"
        data-testid="candidatures-counter"
      >
        {items.length} dossier{items.length > 1 ? 's' : ''}
      </p>

      <CandidaturesFilterChips active={filter} counts={counts} onChange={setFilter} />

      {filtered.length === 0 ? (
        filter === 'all' ? (
          <EmptyState
            title="Pas encore de candidature"
            description="Explorez les opportunités et postulez à celles qui vous correspondent."
            actionLabel="Voir les opportunités"
            onAction={() => router.push('/opportunites')}
          />
        ) : (
          <div
            className="rounded-gj-md border border-gj-line bg-gj-surface p-space-4 text-fs-300 text-color-text-secondary"
            data-testid="candidatures-empty-filter"
          >
            Aucune candidature à cette étape pour l'instant.{' '}
            <button
              type="button"
              className="font-bold text-gj-teal-deep underline"
              onClick={() => setFilter('all')}
            >
              Voir toutes
            </button>
          </div>
        )
      ) : (
        <ul
          className="grid grid-cols-1 lg:grid-cols-2 gap-space-3"
          data-testid="candidatures-list"
          aria-label="Liste des candidatures"
        >
          {filtered.map((item) => (
            <li key={item.id}>
              <CandidatureCard item={item} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-fs-100 text-color-text-muted text-center mt-space-2">
        Besoin d'aide ?{' '}
        <Link href="/jeune/tableau-de-bord" className="font-bold text-gj-teal-deep underline">
          Retour au tableau de bord
        </Link>
      </p>

      <span className="sr-only" data-testid="pipeline-steps-count">
        {STEPS.length}
      </span>
    </div>
  )
}
