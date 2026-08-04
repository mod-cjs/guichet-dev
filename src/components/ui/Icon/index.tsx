import type { SVGAttributes } from 'react'

/**
 * Liste des ids présents dans `public/icons.svg` (préfixe `i-` retiré).
 * Tenir cette liste alignée avec le sprite SVG.
 */
export const ICON_NAMES = [
  'agriculture',
  'alert',
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'attach',
  'bell',
  'block',
  'bolt',
  'bookmark',
  'calendar',
  'camera',
  'car',
  'chart',
  'chat',
  'check',
  'check-circle',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'clock',
  'close',
  'desktop',
  'document',
  'download',
  'employment',
  'engagement',
  'external',
  'eye',
  'eye-off',
  'filter',
  'flame',
  'funding',
  'globe',
  'heart',
  'help',
  'home',
  'image',
  'inclusion',
  'info',
  'learning',
  'light',
  'logout',
  'mail',
  'menu',
  'mic',
  'moon',
  'more-vertical',
  'phone',
  'pin',
  'play',
  'plus',
  'profile',
  'project',
  'quote',
  'refresh',
  'resources',
  'shield',
  'search',
  'settings',
  'share',
  'sparkle',
  'sun',
  'target',
  'trending',
  'upload',
  'user',
  'users',
  'video',
  'whatsapp',
] as const

export type IconName = (typeof ICON_NAMES)[number]

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  /** Nom de l'icône dans le sprite (sans préfixe `i-`). */
  name: IconName
  /** Taille en px (défaut 20). */
  size?: number | string
  /** Si fourni, l'icône devient `role="img"` avec un `<title>` accessible.
   *  Sinon `aria-hidden="true"` (décoratif). */
  title?: string
}

/**
 * <Icon /> — wrapper d'icône utilisant le sprite SVG global servi
 * statiquement depuis `/icons.svg` (single fetch, mis en cache navigateur).
 *
 * Conforme aux règles d'accessibilité du design system v2 :
 * - décoratif par défaut (aria-hidden), `role="img"` si `title` fourni
 * - couleur héritée via `currentColor`
 * - taille personnalisable
 */
export function Icon({ name, size = 20, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <use href={`/icons.svg#i-${name}`} />
    </svg>
  )
}
