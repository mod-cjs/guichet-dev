import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Label affiché dans le chip. */
  children: ReactNode
  /** État sélectionné (visuel teal-soft). */
  selected?: boolean
  /** Affiche une croix à droite déclenchant `onRemove`. */
  removable?: boolean
  /** Callback appelé quand on clique sur la croix (uniquement si removable). */
  onRemove?: () => void
  /** Icône optionnelle à gauche du label (depuis le sprite). */
  icon?: IconName
}

/**
 * <Chip /> — pill sélectable (filtres, intérêts, tags interactifs).
 *
 * Conforme au design v2 :
 * - radius pill (999px), min-h 42px (hit-target proche du minimum tactile)
 * - default : surface + border line, label gris foncé
 * - selected : teal-soft + border teal-deep, label teal-deep en gras
 * - removable : croix à droite (cliquable séparément, aria-label dédié)
 */
export function Chip({
  children,
  selected = false,
  removable = false,
  onRemove,
  icon,
  className = '',
  type = 'button',
  ...rest
}: ChipProps) {
  const base =
    'inline-flex items-center gap-2 rounded-gj-pill border-[1.5px] px-3 ' +
    'text-fs-300 font-semibold leading-none transition-colors duration-200 ' +
    'min-h-[42px] focus:outline-none focus-visible:ring-[3px] ' +
    'focus-visible:ring-[var(--focus-ring-soft)]'

  const state = selected
    ? 'bg-gj-teal-soft border-gj-teal-deep text-gj-teal-deep font-bold'
    : 'bg-gj-surface border-gj-line text-color-text-primary hover:border-gj-line-strong'

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`${base} ${state} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
      {removable ? (
        <span
          role="button"
          aria-label={`Retirer ${typeof children === 'string' ? children : 'le filtre'}`}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onRemove?.()
            }
          }}
          className="inline-flex items-center justify-center rounded-full
                     w-5 h-5 hover:bg-black/5 cursor-pointer"
        >
          <Icon name="close" size={12} />
        </span>
      ) : null}
    </button>
  )
}
