'use client'
import type { OpportuniteSortBy } from '@/types/opportunite'

/** Valeurs des filtres pilotées par le parent (état dans l'URL). */
export interface FiltresValue {
  domaine?: string
  type?: string
  region?: string
  sortBy: OpportuniteSortBy
}

interface FiltresPanelProps {
  value: FiltresValue
  onChange: (next: FiltresValue) => void
  onReset: () => void
}

// Valeurs d'enum (alignées sur prisma/schema.prisma) — figées côté client.
const DOMAINES = [
  'Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement',
  'Sante', 'Education', 'Culture', 'Autre',
]
const TYPES = ['Emploi', 'Stage', 'Formation', 'Bourse', 'Volontariat', 'Appel_a_projets']
const REGIONS = [
  'Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga',
  'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou',
]

function humanize(value: string): string {
  return value.replace(/_/g, ' ')
}

function hasActiveFilter(v: FiltresValue): boolean {
  return Boolean(v.domaine || v.type || v.region)
}

function Pastille({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-space-3 py-[6px] rounded-gj-pill text-fs-200 font-bold
        border-[1.5px] transition-colors min-h-[var(--tap-min)] md:min-h-[36px]
        ${
          active
            ? 'bg-gj-teal border-gj-teal text-white'
            : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-teal'
        }`}
    >
      {children}
    </button>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <details open className="border-b border-gj-line py-space-2">
      <summary className="cursor-pointer text-fs-300 font-bold text-color-text-primary py-space-1">
        {titre}
      </summary>
      <div className="pt-space-2">{children}</div>
    </details>
  )
}

/** Filtres du catalogue — panneau latéral desktop ou contenu du Sheet mobile. */
export function FiltresPanel({ value, onChange, onReset }: FiltresPanelProps) {
  /** Sélection exclusive : recliquer la valeur active la retire. */
  const pick = (key: 'domaine' | 'type' | 'region', v: string) =>
    onChange({ ...value, [key]: value[key] === v ? undefined : v })

  return (
    <div>
      <Section titre="Tri">
        <div className="flex flex-wrap gap-space-1">
          <Pastille
            active={value.sortBy === 'recent'}
            onClick={() => onChange({ ...value, sortBy: 'recent' })}
          >
            Plus récentes
          </Pastille>
          <Pastille
            active={value.sortBy === 'deadline'}
            onClick={() => onChange({ ...value, sortBy: 'deadline' })}
          >
            Échéance proche
          </Pastille>
        </div>
      </Section>

      <Section titre="Domaine">
        <div className="flex flex-wrap gap-space-1">
          {DOMAINES.map((d) => (
            <Pastille key={d} active={value.domaine === d} onClick={() => pick('domaine', d)}>
              {humanize(d)}
            </Pastille>
          ))}
        </div>
      </Section>

      <Section titre="Type">
        <div className="flex flex-wrap gap-space-1">
          {TYPES.map((t) => (
            <Pastille key={t} active={value.type === t} onClick={() => pick('type', t)}>
              {humanize(t)}
            </Pastille>
          ))}
        </div>
      </Section>

      <Section titre="Région">
        <ul className="flex flex-col">
          {REGIONS.map((r) => {
            const active = value.region === r
            return (
              <li key={r}>
                <button
                  type="button"
                  onClick={() => pick('region', r)}
                  aria-pressed={active}
                  className={`w-full flex items-center justify-between text-left
                    text-fs-300 py-space-2 px-space-1 rounded-gj-sm transition-colors
                    ${active ? 'text-gj-teal-deep font-bold' : 'text-gj-grey hover:bg-gj-bg'}`}
                >
                  {humanize(r)}
                  {active && <span aria-hidden>✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </Section>

      {hasActiveFilter(value) && (
        <button
          type="button"
          onClick={onReset}
          className="mt-space-3 text-fs-300 font-bold text-gj-teal hover:underline"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )
}
