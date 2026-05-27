import { HTMLAttributes, ReactNode, ElementType } from 'react'

export type CardVariant = 'default' | 'opportunite' | 'candidature' | 'mycard'
export type CardAccent = 'none' | 'teal' | 'yellow' | 'red'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Variant visuelle alignée sur le design v2. */
  variant?: CardVariant
  /** Padding interne (true par défaut). */
  padded?: boolean
  /** Ajoute une élévation `shadow-gj-md` (hover-friendly). */
  elevated?: boolean
  /** Tag rendu (`div` par défaut). */
  as?: ElementType
  /** Slot d'en-tête optionnel (rendu au-dessus de `children`). */
  header?: ReactNode
  /** Slot de pied optionnel (rendu sous `children`). */
  footer?: ReactNode
  /** Accent latéral hérité v1 (sera retiré en Phase 4). */
  accent?: CardAccent
  /** @deprecated Utiliser `padded`. */
  padding?: boolean
}

const ACCENTS: Record<CardAccent, string> = {
  none:   '',
  teal:   'border-l-[4px] border-l-gj-teal',
  yellow: 'border-l-[4px] border-l-gj-yellow',
  red:    'border-l-[4px] border-l-gj-red',
}

const VARIANT_BASE: Record<CardVariant, string> = {
  default:     'bg-white border-[1.5px] border-gj-line rounded-gj-lg',
  opportunite: 'bg-white border-[1.5px] border-gj-line rounded-gj-lg transition-shadow duration-200 hover:shadow-gj-md',
  candidature: 'bg-white border-[1.5px] border-gj-line rounded-gj-lg',
  // mycard : surface dégradée — texte clair, pas de bordure
  mycard:      'rounded-gj-2xl text-white border-0',
}

/**
 * Card — conteneur surface du design system v2.
 *
 * Variants :
 *  - `default` : surface white standard
 *  - `opportunite` : carte liste (hover subtle)
 *  - `candidature` : carte pipeline (structure spécifique côté contenu)
 *  - `mycard` : carte CJS QR (gradient teal-deep → ink-teal, texte blanc)
 */
export function Card({
  variant = 'default',
  padded = true,
  elevated = false,
  as,
  header,
  footer,
  accent = 'none',
  padding,
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  const Tag = (as ?? 'div') as ElementType
  // Compat ascendante avec l'ancienne prop `padding`.
  const isPadded = padding === undefined ? padded : padding

  const mycardStyle: React.CSSProperties =
    variant === 'mycard'
      ? { backgroundImage: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))' }
      : {}

  const padClass = isPadded
    ? variant === 'opportunite'
      ? 'p-space-4'
      : 'p-space-4'
    : ''

  return (
    <Tag
      className={`${VARIANT_BASE[variant]} ${ACCENTS[accent]} ${padClass} ${elevated ? 'shadow-gj-md' : ''} ${className}`.trim()}
      style={{ ...mycardStyle, ...style }}
      {...props}
    >
      {header !== undefined && (
        <div className={`${isPadded ? '-mx-space-4 -mt-space-4 mb-space-3 px-space-4 py-space-3' : ''} border-b border-gj-line first:rounded-t-gj-lg`}>
          {header}
        </div>
      )}
      {children}
      {footer !== undefined && (
        <div className={`${isPadded ? '-mx-space-4 -mb-space-4 mt-space-3 px-space-4 py-space-3' : ''} border-t border-gj-line last:rounded-b-gj-lg`}>
          {footer}
        </div>
      )}
    </Tag>
  )
}
