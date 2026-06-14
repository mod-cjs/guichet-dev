'use client'

import { Chip, Icon } from '@/components/ui'
import type { TypeEvenementValue } from '@/lib/loaders/evenements'

export type QuandFilter = 'tous' | 'semaine' | 'mois' | 'plus-tard'

interface Props {
  type: TypeEvenementValue | 'all'
  onTypeChange: (v: TypeEvenementValue | 'all') => void
  quand: QuandFilter
  onQuandChange: (v: QuandFilter) => void
  /** Compteurs par type pour l'affichage des badges. */
  counts: Record<TypeEvenementValue | 'all', number>
  onReset: () => void
}

const TYPES: { value: TypeEvenementValue | 'all'; label: string }[] = [
  { value: 'all',        label: 'Tous' },
  { value: 'Atelier',    label: 'Ateliers' },
  { value: 'Forum',      label: 'Forums emploi' },
  { value: 'Formation',  label: 'Formations' },
  { value: 'Webinar',    label: 'Webinaires' },
  { value: 'Conference', label: 'Conférences' },
]

const QUAND: { value: QuandFilter; label: string }[] = [
  { value: 'tous',      label: 'Tous' },
  { value: 'semaine',   label: 'Cette semaine' },
  { value: 'mois',      label: 'Ce mois' },
  { value: 'plus-tard', label: 'Plus tard' },
]

/**
 * Sidebar filtres (desktop ≥lg) + accordéon mobile (cf design-v2/events-web.jsx · EvFilters).
 * - Groupe "Type" : checkboxes + compteurs
 * - Groupe "Quand" : chips horaires rapides
 */
export function EvenementFilters({
  type,
  onTypeChange,
  quand,
  onQuandChange,
  counts,
  onReset,
}: Props) {
  return (
    <aside
      className="bg-white border border-gj-line rounded-gj-lg p-space-4 flex flex-col gap-space-4 lg:sticky lg:top-[var(--gj-sticky-offset)]"
      aria-label="Filtres événements"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-fs-300 font-black text-color-text-primary inline-flex items-center gap-1">
          <Icon name="filter" size={16} />
          Filtres
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
        >
          Réinitialiser
        </button>
      </div>

      <fieldset className="border-0 p-0 m-0 flex flex-col gap-space-2 border-b border-gj-line pb-space-3">
        <legend className="text-fs-100 font-bold uppercase tracking-wider text-color-text-secondary mb-space-1">
          Type
        </legend>
        <ul className="list-none p-0 m-0 flex flex-col gap-space-1">
          {TYPES.map((t) => {
            const on = type === t.value
            return (
              <li key={t.value}>
                <label
                  className={[
                    'flex items-center gap-space-2 py-1 cursor-pointer text-fs-200 min-h-[36px]',
                    on ? 'font-black text-color-text-primary' : 'font-bold text-color-text-secondary',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="evt-type"
                    value={t.value}
                    checked={on}
                    onChange={() => onTypeChange(t.value)}
                    className="w-[18px] h-[18px] accent-gj-teal-deep"
                  />
                  <span className="flex-1">{t.label}</span>
                  <span className="text-fs-100 font-bold text-color-text-muted">
                    {counts[t.value] ?? 0}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset className="border-0 p-0 m-0 flex flex-col gap-space-2">
        <legend className="text-fs-100 font-bold uppercase tracking-wider text-color-text-secondary mb-space-1">
          Quand
        </legend>
        <div className="flex flex-wrap gap-space-2" role="group" aria-label="Filtres temporels">
          {QUAND.map((q) => (
            <Chip key={q.value} selected={quand === q.value} onClick={() => onQuandChange(q.value)}>
              {q.label}
            </Chip>
          ))}
        </div>
      </fieldset>
    </aside>
  )
}
