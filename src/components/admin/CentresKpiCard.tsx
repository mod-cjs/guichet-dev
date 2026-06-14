import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

interface Props {
  label: string
  /** Valeur principale formatée (déjà stringifiée, ex. "1 245" ou "82 %"). */
  value: string
  /** Variation vs période précédente, en %, négative pour baisse. */
  variation?: number
  /** Hint accessibilité (ex. "vs 30 jours précédents"). */
  variationLabel?: string
}

function formatVariation(v: number): string {
  if (!Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1).replace(/\.0$/, '')} %`
}

/**
 * Carte KPI compacte pour le dashboard analytics centres.
 * Affiche un label, une valeur géante et — si fournie — une variation
 * vs période précédente avec flèche directionnelle.
 */
export function CentresKpiCard({ label, value, variation, variationLabel }: Props) {
  const hasVariation = typeof variation === 'number' && Number.isFinite(variation)
  const positive = hasVariation && (variation ?? 0) >= 0
  const variationColor = positive ? 'text-gj-teal' : 'text-gj-red'

  return (
    <Card padded elevated>
      <div className="flex flex-col gap-space-2">
        <span className="text-fs-200 text-color-text-secondary font-semibold uppercase tracking-wide">
          {label}
        </span>
        <span className="text-fs-800 font-black text-color-text-primary leading-none">
          {value}
        </span>
        {hasVariation ? (
          <span className={`text-fs-200 font-semibold flex items-center gap-1 ${variationColor}`}>
            <Icon name={positive ? 'arrow-up' : 'arrow-right'} size={14} />
            <span>{formatVariation(variation ?? 0)}</span>
            {variationLabel ? (
              <span className="text-color-text-secondary font-normal ml-1">
                {variationLabel}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </Card>
  )
}
