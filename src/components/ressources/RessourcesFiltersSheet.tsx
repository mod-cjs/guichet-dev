'use client'
import { useEffect, useState } from 'react'
import { Button, Sheet } from '@/components/ui'
import type {
  TypeRessourceValue,
  NiveauRessourceValue,
  LangueRessourceValue,
  DateBucket,
} from '@/lib/loaders/ressources'

/**
 * Bottom-sheet de filtres avancés du catalogue de ressources — mobile.
 * GUIC-24 · M6 (pattern hérité de OpportunitesFiltersSheet · GUIC-188).
 *
 * Filtres : Type · Catégorie (multi-select texte) · Niveau · Langue · Date publication.
 * Stratégie : draft local, appliqué au clic "Voir les N résultats".
 */

export interface RessourcesFiltresValue {
  type?: TypeRessourceValue
  niveau?: NiveauRessourceValue
  langue?: LangueRessourceValue
  categories?: string[]
  date?: DateBucket
}

export interface RessourcesFiltersSheetProps {
  isOpen: boolean
  onClose: () => void
  value: RessourcesFiltresValue
  /** Catégories disponibles pour la sélection multiple. */
  categoriesOptions: string[]
  totalCount: number
  onApply: (next: RessourcesFiltresValue) => void
}

const TYPES: { value: TypeRessourceValue; label: string }[] = [
  { value: 'PDF',   label: 'PDF' },
  { value: 'Video', label: 'Vidéos' },
  { value: 'Lien',  label: 'Liens' },
  { value: 'Guide', label: 'Guides' },
  { value: 'Outil', label: 'Outils' },
]

const NIVEAUX: { value: NiveauRessourceValue; label: string }[] = [
  { value: 'Debutant',      label: 'Débutant' },
  { value: 'Intermediaire', label: 'Intermédiaire' },
  { value: 'Avance',        label: 'Avancé' },
]

const LANGUES: { value: LangueRessourceValue; label: string }[] = [
  { value: 'FR',    label: 'Français' },
  { value: 'Wolof', label: 'Wolof' },
]

const DATES: { value: DateBucket; label: string }[] = [
  { value: 'all',    label: 'Toutes les dates' },
  { value: 'recent', label: '30 derniers jours' },
  { value: 'year',   label: 'Cette année' },
]

export function countActiveFilters(v: RessourcesFiltresValue): number {
  let n = 0
  if (v.type) n++
  if (v.niveau) n++
  if (v.langue) n++
  if (v.date && v.date !== 'all') n++
  if (v.categories && v.categories.length) n += v.categories.length
  return n
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-fs-100 font-black uppercase tracking-[0.4px] text-gj-grey mb-space-2">
      {children}
    </div>
  )
}

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
        'text-fs-200 leading-none border-[1.5px] transition-colors',
        'min-h-[var(--tap-min)] md:min-h-[36px]',
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

export function RessourcesFiltersSheet({
  isOpen,
  onClose,
  value,
  categoriesOptions,
  totalCount,
  onApply,
}: RessourcesFiltersSheetProps) {
  const [draft, setDraft] = useState<RessourcesFiltresValue>(value)

  useEffect(() => {
    if (isOpen) setDraft(value)
  }, [isOpen, value])

  const active = countActiveFilters(draft)

  const toggleSingle = <K extends 'type' | 'niveau' | 'langue'>(
    key: K,
    v: NonNullable<RessourcesFiltresValue[K]>,
  ) => {
    setDraft((d) => ({ ...d, [key]: d[key] === v ? undefined : v }))
  }

  const toggleCategorie = (cat: string) => {
    setDraft((d) => {
      const cur = d.categories ?? []
      const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]
      return { ...d, categories: next.length ? next : undefined }
    })
  }

  const setDate = (v: DateBucket) => {
    setDraft((d) => ({ ...d, date: v }))
  }

  const reset = () => {
    setDraft({})
  }

  const apply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Filtres avancés" variant="bottom">
      <div data-testid="ressources-filters-sheet" className="flex flex-col gap-space-4">
        <div className="flex items-center justify-between">
          <div className="text-fs-300 text-color-text-secondary">
            {active === 0
              ? 'Aucun filtre actif'
              : `${active} filtre${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}`}
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
              <PillToggle
                key={t.value}
                selected={draft.type === t.value}
                onClick={() => toggleSingle('type', t.value)}
              >
                {t.label}
              </PillToggle>
            ))}
          </div>
        </section>

        {categoriesOptions.length > 0 && (
          <section>
            <SectionLabel>Catégorie</SectionLabel>
            <div className="flex flex-wrap gap-space-1">
              {categoriesOptions.map((c) => (
                <PillToggle
                  key={c}
                  selected={(draft.categories ?? []).includes(c)}
                  onClick={() => toggleCategorie(c)}
                >
                  {c}
                </PillToggle>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionLabel>Niveau</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            {NIVEAUX.map((n) => (
              <PillToggle
                key={n.value}
                selected={draft.niveau === n.value}
                onClick={() => toggleSingle('niveau', n.value)}
              >
                {n.label}
              </PillToggle>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Langue</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            {LANGUES.map((l) => (
              <PillToggle
                key={l.value}
                selected={draft.langue === l.value}
                onClick={() => toggleSingle('langue', l.value)}
              >
                {l.label}
              </PillToggle>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Date de publication</SectionLabel>
          <div className="flex flex-wrap gap-space-1">
            {DATES.map((d) => (
              <PillToggle
                key={d.value}
                selected={(draft.date ?? 'all') === d.value}
                onClick={() => setDate(d.value)}
              >
                {d.label}
              </PillToggle>
            ))}
          </div>
        </section>
      </div>

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
