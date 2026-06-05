import type { TypeOpportunite } from '@prisma/client'
import { Icon, type IconName } from '@/components/ui'

/**
 * Chip non-interactif (label) qui colorise un type d'opportunité selon la
 * sectorisation visuelle du design v2 (lot3-opps-mobile).
 *
 * GUIC-188 — Phase 2B/2 mobile.
 *
 * Sectorisation (alignée sur l'enum Prisma `TypeOpportunite`) :
 *  - Emploi          → teal (cjs)
 *  - Stage           → teal (cjs)
 *  - Formation       → blue (info / learning)
 *  - Bourse          → yellow (partner)
 *  - Volontariat     → green (engagement)
 *  - Appel_a_projets → yellow (partner)
 *
 * Note : si une nouvelle valeur d'enum apparaît sans couleur sectorielle,
 * le fallback est `grey` (TODO Phase 4).
 */

type Tone = 'teal' | 'yellow' | 'blue' | 'green' | 'red' | 'grey'

const TYPE_TONE: Record<TypeOpportunite, Tone> = {
  Emploi: 'teal',
  Stage: 'teal',
  Formation: 'blue',
  Bourse: 'yellow',
  Volontariat: 'green',
  Appel_a_projets: 'yellow',
}

const TONE_CLASSES: Record<Tone, string> = {
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  blue:   'bg-gj-blue-soft text-gj-blue-ink',
  green:  'bg-gj-green-soft text-gj-green-ink',
  red:    'bg-gj-red-soft text-gj-red-ink',
  grey:   'bg-gj-bg text-gj-grey',
}

/** Libellé d'affichage d'un type Prisma (`Appel_a_projets` → "Appel à projets"). */
export function typeLabel(value: TypeOpportunite): string {
  if (value === 'Appel_a_projets') return 'Appel à projets'
  return value.replace(/_/g, ' ')
}

export interface OpportuniteTypeChipProps {
  type: TypeOpportunite
  /** Override du ton (utile pour `urgent` quand deadline ≤ 7j). */
  tone?: Tone
  /** Préfixe libre (ex. label déjà inclus dans `STAGE · J-3`). */
  prefix?: string
  /** Suffixe libre (ex. compte à rebours `J-3`). */
  suffix?: string
  /** Icône optionnelle rendue à gauche dans la même pill (urgence). */
  leadingIcon?: IconName
  className?: string
}

/**
 * <OpportuniteTypeChip /> — étiquette pill majuscule colorée par type.
 * Non-interactif (rendu en `<span>`), conforme au design v2 mobile.
 */
export function OpportuniteTypeChip({
  type,
  tone,
  prefix,
  suffix,
  leadingIcon,
  className = '',
}: OpportuniteTypeChipProps) {
  const t = tone ?? TYPE_TONE[type] ?? 'grey'
  return (
    <span
      data-type={type}
      data-tone={t}
      className={[
        'inline-flex items-center gap-1 px-space-2 py-[2px] rounded-gj-pill',
        'text-fs-100 font-black uppercase tracking-[0.4px] leading-none whitespace-nowrap',
        TONE_CLASSES[t],
        className,
      ].join(' ')}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={12} aria-hidden /> : null}
      {`${prefix ? `${prefix} ` : ''}${typeLabel(type)}${suffix ? ` · ${suffix}` : ''}`}
    </span>
  )
}
