'use client'
import { Chip } from '@/components/ui'
import { GROUPE_LABELS, type CandidatureGroupe } from './types'

// GUIC-689 (É-14) — regroupement par intention, « Brouillons » gardé à part :
// c'est la seule catégorie où le jeune a quelque chose à finir.
const FILTER_ORDER: CandidatureGroupe[] = [
  'all',
  'Brouillons',
  'EnCours',
  'Entretiens',
  'Cloturees',
]

export interface CandidaturesFilterChipsProps {
  active: CandidatureGroupe
  counts: Record<CandidatureGroupe, number>
  onChange: (filter: CandidatureGroupe) => void
}

/**
 * Bandeau de chips de filtre statut pour la liste candidatures (GUIC-190).
 *
 * Pas d'`overflow-x-auto` (règle navigation CLAUDE.md) : on autorise le wrap
 * vertical sur très petits écrans.
 */
export function CandidaturesFilterChips({
  active,
  counts,
  onChange,
}: CandidaturesFilterChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer les candidatures par statut"
      className="flex flex-wrap gap-2"
      data-testid="candidatures-filter-chips"
    >
      {FILTER_ORDER.map((filter) => {
        const count = counts[filter] ?? 0
        return (
          <Chip
            key={filter}
            selected={active === filter}
            onClick={() => onChange(filter)}
            data-filter={filter}
          >
            <span className="flex items-center gap-1.5">
              <span>{GROUPE_LABELS[filter]}</span>
              <span
                className={[
                  'inline-flex min-w-[18px] justify-center rounded-gj-pill px-1 text-[10px] font-bold',
                  active === filter
                    ? 'bg-gj-teal-deep/15 text-gj-teal-deep'
                    : 'bg-gj-line text-color-text-muted',
                ].join(' ')}
              >
                {count}
              </span>
            </span>
          </Chip>
        )
      })}
    </div>
  )
}
