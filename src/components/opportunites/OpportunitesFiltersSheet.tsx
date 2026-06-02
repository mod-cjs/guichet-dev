'use client'
import { useEffect, useState } from 'react'
import type { Domaine, Region, TypeOpportunite } from '@prisma/client'
import { Button, Sheet } from '@/components/ui'
import { REGIONS_SENEGAL } from '@/lib/regions'
import { typeLabel } from './OpportuniteTypeChip'
import type { FiltresValue } from './FiltresPanel'

/**
 * Bottom-sheet de filtres du catalogue d'opportunités — mobile (GUIC-188).
 * Design v2 lot3-opps-mobile · M2.
 *
 * Sémantique : single-select par dimension (Type, Domaine, Région, Deadline)
 * pour rester aligné sur l'API actuelle `/api/opportunites` (un seul `type=`,
 * `domaine=`, `region=` par requête). L'enrichissement multi-valeurs est
 * différé (Phase 4) — il nécessitera une évolution coordonnée du loader.
 *
 * Pattern :
 *  - état local (`draft`) tampon, validé sur "Appliquer"
 *  - "Réinitialiser" remet `draft` à vide (sans fermer)
 *  - "Appliquer (N résultats)" propage au parent et ferme
 */

const TYPES: TypeOpportunite[] = [
  'Emploi',
  'Stage',
  'Formation',
  'Bourse',
  'Volontariat',
  'Appel_a_projets',
]

const DOMAINES: Domaine[] = [
  'Agriculture',
  'Numerique',
  'Entrepreneuriat',
  'Citoyennete',
  'Environnement',
  'Sante',
  'Education',
  'Culture',
  'Autre',
]

type DeadlineFilter = 'all' | 'open'

export interface OpportunitesFiltersSheetProps {
  isOpen: boolean
  onClose: () => void
  value: FiltresValue
  /** Total connu pour le CTA d'application ("Voir les N résultats"). */
  totalCount: number
  /** Appelé quand l'utilisateur clique "Appliquer". */
  onApply: (next: FiltresValue) => void
}

function emptyDraft(sortBy: FiltresValue['sortBy']): FiltresValue {
  return { sortBy, domaine: undefined, type: undefined, region: undefined }
}

function countActive(v: FiltresValue): number {
  return [v.domaine, v.type, v.region].filter(Boolean).length
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ')
}

/**
 * <SectionLabel /> — en-tête majuscule d'une section du sheet.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-fs-100 font-black uppercase tracking-[0.4px] text-gj-grey mb-space-2">
      {children}
    </div>
  )
}

/**
 * <PillToggle /> — pastille toggle sélectionnée / non.
 * Reproduit le style design v2 (teal-soft + border teal quand `on`).
 */
function PillToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'inline-flex items-center px-space-3 py-[8px] rounded-gj-pill',
        'text-fs-200 leading-none border-[1.5px] transition-colors min-h-[36px]',
        'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
        selected
          ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep font-black'
          : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong font-semibold',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function OpportunitesFiltersSheet({
  isOpen,
  onClose,
  value,
  totalCount,
  onApply,
}: OpportunitesFiltersSheetProps) {
  // Tampon local — la sélection n'est validée qu'au clic "Appliquer".
  const [draft, setDraft] = useState<FiltresValue>(value)
  const [deadline, setDeadline] = useState<DeadlineFilter>('all')

  // Resync quand la sheet s'ouvre (cas d'une nouvelle entrée).
  useEffect(() => {
    if (isOpen) setDraft(value)
  }, [isOpen, value])

  const activeCount = countActive(draft)

  const toggle = <K extends 'type' | 'domaine' | 'region'>(key: K, v: string) => {
    setDraft((d) => ({ ...d, [key]: d[key] === v ? undefined : (v as FiltresValue[K]) }))
  }

  const reset = () => {
    setDraft(emptyDraft(draft.sortBy))
    setDeadline('all')
  }

  const apply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Filtres" variant="bottom">
      <div data-testid="opp-filters-sheet" className="flex flex-col gap-space-4">
        <div className="flex items-center justify-between">
          <div className="text-fs-300 text-color-text-secondary">
            {activeCount === 0
              ? 'Aucun filtre actif'
              : `${activeCount} filtre${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`}
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-fs-200 font-black text-gj-grey hover:text-gj-ink"
          >
            Tout effacer
          </button>
        </div>

        <section>
          <SectionLabel>Type</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            {TYPES.map((t) => (
              <PillToggle key={t} selected={draft.type === t} onClick={() => toggle('type', t)}>
                {typeLabel(t)}
              </PillToggle>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Domaine</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            {DOMAINES.map((d) => (
              <PillToggle key={d} selected={draft.domaine === d} onClick={() => toggle('domaine', d)}>
                {humanize(d)}
              </PillToggle>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Région</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            {REGIONS_SENEGAL.map((r) => (
              <PillToggle
                key={r.value}
                selected={draft.region === r.value}
                onClick={() => toggle('region', r.value as Region)}
              >
                {r.label}
              </PillToggle>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Échéance</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            <PillToggle selected={deadline === 'all'} onClick={() => setDeadline('all')}>
              Toutes
            </PillToggle>
            <PillToggle selected={deadline === 'open'} onClick={() => setDeadline('open')}>
              Candidature ouverte
            </PillToggle>
          </div>
          {deadline === 'open' && (
            <p className="text-fs-100 text-gj-grey mt-space-1">
              Toutes les opportunités listées sont déjà filtrées : seules les candidatures
              encore ouvertes sont affichées.
            </p>
          )}
        </section>
      </div>

      {/* Barre d'action collante */}
      <div
        className="sticky bottom-0 -mx-space-4 mt-space-4 px-space-4 pt-space-3 pb-space-2
          bg-gj-surface border-t border-gj-line flex gap-space-2"
      >
        <Button variant="ghost" size="lg" onClick={reset} className="shrink-0">
          Réinitialiser
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={apply}>
          {totalCount > 0
            ? `Voir les ${totalCount} résultat${totalCount > 1 ? 's' : ''}`
            : 'Appliquer'}
        </Button>
      </div>
    </Sheet>
  )
}
