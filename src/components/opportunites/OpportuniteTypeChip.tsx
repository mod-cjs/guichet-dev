import type { TypeOpportunite } from '@prisma/client'
import { Icon, type IconName } from '@/components/ui'
import { TYPE_CAT, type CatFamily } from './opportunite-type-meta'

/**
 * Chip non-interactif (label) qui colorise un type d'opportunité selon le
 * code couleur par catégorie (design v5 — « Reponse au retour design V3 » §2).
 *
 * GUIC-188 — Phase 2B/2 mobile. GUIC-689 — migration vers le code couleur
 * catégorie (`--cat-*`) : le chip ne rend QUE la catégorie. L'urgence de
 * deadline est désormais une pastille séparée (rouge, `.gj-urgent`) rendue
 * par les consommateurs (`OppCard`, `HeroBadge`) — plus de ton fusionné.
 *
 * Sectorisation et icônes : voir `opportunite-type-meta.ts` (source unique
 * partagée avec OppCard / YayeOppCard).
 *
 * Note : si une nouvelle valeur d'enum apparaît sans famille catégorie,
 * le fallback est `cat-neutre`.
 */

const CAT_CLASSES: Record<CatFamily, string> = {
  'cat-emploi':      'bg-cat-emploi-soft text-cat-emploi-ink',
  'cat-stage':       'bg-cat-stage-soft text-cat-stage-ink',
  'cat-formation':   'bg-cat-formation-soft text-cat-formation-ink',
  'cat-financement': 'bg-cat-financement-soft text-cat-financement-ink',
  'cat-evenement':   'bg-cat-evenement-soft text-cat-evenement-ink',
  'cat-volontariat': 'bg-cat-volontariat-soft text-cat-volontariat-ink',
  'cat-neutre':      'bg-cat-neutre-soft text-cat-neutre-ink',
}

/** Libellé d'affichage d'un type Prisma (`Appel_a_projets` → "Appel à projets"). */
export function typeLabel(value: TypeOpportunite): string {
  if (value === 'Appel_a_projets') return 'Appel à projets'
  return value.replace(/_/g, ' ')
}

export interface OpportuniteTypeChipProps {
  type: TypeOpportunite
  /** Icône optionnelle rendue à gauche dans la même pill. */
  leadingIcon?: IconName
  className?: string
}

/**
 * <OpportuniteTypeChip /> — étiquette pill majuscule colorée par catégorie.
 * Non-interactif (rendu en `<span>`). Ne rend que le libellé de catégorie
 * (jamais de suffixe d'urgence fusionné — cf. pastille `.gj-urgent` séparée).
 */
export function OpportuniteTypeChip({
  type,
  leadingIcon,
  className = '',
}: OpportuniteTypeChipProps) {
  const cat = TYPE_CAT[type] ?? 'cat-neutre'
  return (
    <span
      data-type={type}
      data-cat={cat}
      className={[
        'inline-flex items-center gap-1 px-space-2 py-[2px] rounded-gj-pill',
        'text-fs-100 font-extrabold uppercase tracking-[0.4px] leading-none whitespace-nowrap',
        CAT_CLASSES[cat],
        className,
      ].join(' ')}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={12} aria-hidden /> : null}
      {typeLabel(type)}
    </span>
  )
}
