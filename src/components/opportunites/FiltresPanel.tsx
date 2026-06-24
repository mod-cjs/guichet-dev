'use client'
import { Icon, Chip } from '@/components/ui'
import { typeLabel } from './OpportuniteTypeChip'
import { REGIONS_SENEGAL } from '@/lib/regions'
import type { OpportuniteSortBy } from '@/types/opportunite'

/** Valeurs des filtres pilotées par le parent (état dans l'URL). */
export interface FiltresValue {
  domaine?: string
  type?: string
  region?: string
  /** Filtre rémunération — "yes" = uniquement payées. */
  remuneration?: 'yes' | 'no'
  /** Plage deadline — "7" = J-7, "30" = J-30, undef = sans limite. */
  deadline?: '7' | '30'
  sortBy: OpportuniteSortBy
}

/** Compteur par valeur (optionnel, du loader). */
export type FacetCounts = Partial<Record<string, number>>

export interface FiltresPanelProps {
  value: FiltresValue
  onChange: (next: FiltresValue) => void
  onReset: () => void
  /** Total résultats utilisé dans le CTA "Appliquer N filtres · X résultats". */
  resultsCount?: number
  /** Compteurs par valeur (TODO loader). */
  counts?: {
    type?: FacetCounts
    domaine?: FacetCounts
    region?: FacetCounts
    deadline?: FacetCounts
    remuneration?: FacetCounts
  }
  /** Callback explicite "Appliquer" — optionnel : par défaut les changements
   *  sont propagés immédiatement via onChange. */
  onApply?: () => void
}

// Valeurs d'enum (alignées sur prisma/schema.prisma) — figées côté client.
const DOMAINES = [
  'Agriculture',
  'Numerique',
  'Entrepreneuriat',
  'Citoyennete',
  'Environnement',
  'Sante',
  'Education',
  'Culture',
  'Autre',
] as const

const TYPES = [
  'Emploi',
  'Stage',
  'Formation',
  'Bourse',
  'Volontariat',
  'Appel_a_projets',
] as const

/** Mapping enrichi des libellés de domaine — valeur enum inchangée, label enrichi. */
const DOMAINE_LABELS: Record<string, string> = {
  Agriculture:    'Agriculture & élevage',
  Numerique:      'Numérique / Tech',
  Entrepreneuriat: 'Entrepreneuriat',
  Citoyennete:    'Citoyenneté',
  Environnement:  'Environnement',
  Sante:          'Santé',
  Education:      'Éducation',
  Culture:        'Culture',
  Autre:          'Autre',
}

function humanizeDomaine(value: string): string {
  return DOMAINE_LABELS[value] ?? value.replace(/_/g, ' ')
}

function countActive(v: FiltresValue): number {
  return [v.domaine, v.type, v.region, v.remuneration, v.deadline].filter(Boolean).length
}

interface FilterCheckProps {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: () => void
}

/**
 * <FilterCheck /> — checkbox alignée (label + compteur) conforme design v2
 * (`lot3-opps-web.jsx#FilterCheck` L.11-29).
 */
function FilterCheck({ id, label, count, checked, onChange }: FilterCheckProps) {
  return (
    <li className="flex items-center gap-space-2 py-[6px]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="appearance-none w-[18px] h-[18px] rounded border-[1.5px] border-gj-line-strong
          bg-gj-surface cursor-pointer transition-colors
          checked:bg-gj-teal-deep checked:border-gj-teal-deep
          focus:outline-none focus-visible:ring-[3px]
          focus-visible:ring-[var(--focus-ring-soft)]
          relative
          checked:after:content-['']
          checked:after:absolute checked:after:left-[4px] checked:after:top-[1px]
          checked:after:w-[6px] checked:after:h-[10px]
          checked:after:border-r-2 checked:after:border-b-2 checked:after:border-white
          checked:after:rotate-45"
      />
      <label
        htmlFor={id}
        className={`flex-1 text-fs-200 cursor-pointer ${
          checked ? 'font-bold text-color-text-primary' : 'text-color-text-primary'
        }`}
      >
        {label}
      </label>
      {typeof count === 'number' && (
        <span className="text-fs-100 text-color-text-secondary font-bold tabular-nums">
          {count}
        </span>
      )}
    </li>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  return (
    <details open={defaultOpen} className="group border-b border-gj-line py-space-2 last:border-b-0">
      <summary
        className="flex items-center justify-between cursor-pointer list-none
          text-fs-100 font-black uppercase tracking-[0.4px] text-gj-grey py-space-1
          [&::-webkit-details-marker]:hidden"
      >
        <span>{title}</span>
        <Icon
          name="chevron-right"
          size={14}
          className="transition-transform group-open:rotate-90 text-gj-grey"
          aria-hidden
        />
      </summary>
      <div className="pt-space-1">{children}</div>
    </details>
  )
}

/**
 * <FiltresPanel /> — panneau filtres latéral desktop (sticky).
 *
 * GUIC-251 — Wave 3 audit UI. Conforme design v2
 * (`lot3-opps-web.jsx#WebFilterPanel` L.34-115).
 *
 * Apports vs version précédente :
 *  - sémantique checkbox (au lieu de pastilles)
 *  - sections en accordion (`<details open>`)
 *  - compteurs par valeur (props.counts, TODO loader)
 *  - sections supplémentaires Rémunération + Deadline
 *  - header avec badge actif + lien "Tout effacer"
 *  - CTA sticky "Appliquer N filtres · X résultats"
 *
 * Note compatibilité : conserve l'API single-select par dimension (un seul
 * `type` / `domaine` / `region` actif à la fois) — aligné sur le loader
 * actuel. Le multi-select sera ajouté quand le loader le supportera.
 */
export function FiltresPanel({
  value,
  onChange,
  onReset,
  resultsCount,
  counts,
  onApply,
}: FiltresPanelProps) {
  const pick = (key: 'domaine' | 'type' | 'region', v: string) =>
    onChange({ ...value, [key]: value[key] === v ? undefined : v })

  const toggleRemun = (v: 'yes' | 'no') =>
    onChange({ ...value, remuneration: value.remuneration === v ? undefined : v })

  const toggleDeadline = (v: '7' | '30') =>
    onChange({ ...value, deadline: value.deadline === v ? undefined : v })

  const active = countActive(value)

  return (
    <div
      className="bg-gj-surface border-[1.5px] border-gj-line rounded-gj-md
        flex flex-col"
      data-testid="filtres-panel"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-space-3 pt-space-3 pb-space-2
        border-b border-gj-line">
        <div className="flex items-center gap-space-1">
          <Icon name="filter" size={18} className="text-gj-teal-deep" aria-hidden />
          <span className="text-fs-300 font-black text-color-text-primary">Filtres</span>
          {active > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1
                rounded-gj-pill bg-gj-teal-deep text-white text-fs-100 font-black ml-1"
              aria-label={`${active} filtre${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}`}
            >
              {active}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={active === 0}
          className="text-fs-200 font-bold text-gj-teal-deep hover:underline
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-[3px]
            focus-visible:ring-[var(--focus-ring-soft)] rounded"
        >
          Tout effacer
        </button>
      </header>

      {/* Sections — scrollable si trop long */}
      <div className="px-space-3 py-space-1 overflow-y-auto max-h-[calc(100vh-220px)]">
        <Section title="Type">
          <ul className="space-y-0">
            {TYPES.map((t) => (
              <FilterCheck
                key={t}
                id={`f-type-${t}`}
                label={typeLabel(t)}
                count={counts?.type?.[t]}
                checked={value.type === t}
                onChange={() => pick('type', t)}
              />
            ))}
          </ul>
        </Section>

        <Section title="Domaine">
          <ul className="space-y-0">
            {DOMAINES.map((d) => (
              <FilterCheck
                key={d}
                id={`f-dom-${d}`}
                label={humanizeDomaine(d)}
                count={counts?.domaine?.[d]}
                checked={value.domaine === d}
                onChange={() => pick('domaine', d)}
              />
            ))}
          </ul>
        </Section>

        <Section title="Région">
          <div className="flex flex-wrap gap-[6px] pt-space-1">
            {REGIONS_SENEGAL.map((r) => (
              <Chip
                key={r.value}
                selected={value.region === r.value}
                onClick={() => pick('region', r.value)}
              >
                {r.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Rémunération">
          <ul className="space-y-0">
            <FilterCheck
              id="f-rem-yes"
              label="Rémunéré"
              count={counts?.remuneration?.yes}
              checked={value.remuneration === 'yes'}
              onChange={() => toggleRemun('yes')}
            />
            <FilterCheck
              id="f-rem-no"
              label="Non rémunéré"
              count={counts?.remuneration?.no}
              checked={value.remuneration === 'no'}
              onChange={() => toggleRemun('no')}
            />
          </ul>
        </Section>

        <Section title="Deadline">
          <ul className="space-y-0">
            <FilterCheck
              id="f-dl-7"
              label="Moins de 7 jours"
              count={counts?.deadline?.['7']}
              checked={value.deadline === '7'}
              onChange={() => toggleDeadline('7')}
            />
            <FilterCheck
              id="f-dl-30"
              label="Moins de 30 jours"
              count={counts?.deadline?.['30']}
              checked={value.deadline === '30'}
              onChange={() => toggleDeadline('30')}
            />
          </ul>
        </Section>
      </div>

      {/* CTA sticky bottom — affiché si onApply fourni */}
      {onApply && (
        <footer className="sticky bottom-0 px-space-3 py-space-2 bg-gj-surface
          border-t border-gj-line">
          <button
            type="button"
            onClick={onApply}
            disabled={active === 0}
            className="w-full inline-flex items-center justify-center gap-space-1
              bg-gj-teal-deep text-white font-black text-fs-300 rounded-gj-md
              min-h-[44px] px-space-3 transition-colors
              hover:bg-gj-teal disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus-visible:ring-[3px]
              focus-visible:ring-[var(--focus-ring-soft)]"
          >
            {active === 0
              ? 'Sélectionne un filtre'
              : `Appliquer ${active} filtre${active > 1 ? 's' : ''}${
                  typeof resultsCount === 'number'
                    ? ` · ${resultsCount} résultat${resultsCount > 1 ? 's' : ''}`
                    : ''
                }`}
          </button>
        </footer>
      )}
    </div>
  )
}
