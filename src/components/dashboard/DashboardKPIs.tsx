import { Icon, type IconName } from '@/components/ui'

/**
 * Tonalités disponibles pour les mini-cards KPI.
 * Chaque tonalité a un fond doux (token `gj-*-soft`) et un texte d'accent.
 */
export type KPITone = 'teal' | 'yellow' | 'blue' | 'red'

export interface KPIItem {
  /** Libellé court affiché sous la valeur (ex. "Candidatures"). */
  label:   string
  /** Valeur principale (string pour permettre "72 %" ou "—"). */
  value:   string | number
  /** Texte d'évolution / contexte secondaire (ex. "+1 cette semaine"). */
  delta?:  string
  /** Icône (nom dans le sprite SVG). */
  icon:    IconName
  /** Tonalité de fond / d'accent. */
  tone:    KPITone
}

export interface DashboardKPIsProps {
  items: KPIItem[]
}

const TONE_BG: Record<KPITone, string> = {
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  blue:   'bg-gj-blue-soft text-gj-blue-ink',
  red:    'bg-gj-red-soft text-gj-red-ink',
}

/**
 * Grille de 4 mini-cards KPI affichées en haut du dashboard bénéficiaire.
 * Mobile : grille 2 colonnes (compact). Desktop (≥ md) : 4 colonnes.
 */
export function DashboardKPIs({ items }: DashboardKPIsProps) {
  return (
    <section
      className="grid grid-cols-2 md:grid-cols-4 gap-space-3"
      aria-label="Indicateurs clés"
    >
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-white border-[1.5px] border-gj-line rounded-gj-lg p-space-3 flex items-start gap-space-3"
        >
          <span
            className={`w-10 h-10 rounded-gj-md inline-flex items-center justify-center flex-shrink-0 ${TONE_BG[kpi.tone]}`}
            aria-hidden
          >
            <Icon name={kpi.icon} size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-fs-500 font-black leading-none">{kpi.value}</div>
            <div className="text-fs-100 text-gj-grey font-semibold mt-1 leading-tight">
              {kpi.label}
            </div>
            {kpi.delta && (
              <div className="text-fs-100 font-bold text-gj-green-ink mt-1 leading-tight">
                {kpi.delta}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
