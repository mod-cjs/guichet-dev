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
 * Conforme au design v5 (Lot 14 — Bibliothèque de composants) :
 * - radius pill (999px), min-h 42px (hit-target proche du minimum tactile)
 * - default : surface + border line, label gris foncé
 * - selected : fond var(--gj-teal-deep) plein, texte blanc, sans bordure
 * - removable : 2 boutons sibling dans un container role=group — le toggle
 *   (pill principale) et le remove (croix à droite). Pas d'imbrication
 *   interactive (règle a11y HTML : un <button> ne peut pas en contenir un autre).
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
  const focusRing =
    'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]'

  const stateClasses = selected
    ? 'bg-gj-teal-deep border-transparent text-white font-bold'
    : 'bg-gj-surface border-gj-line text-color-text-primary hover:border-gj-line-strong'

  const toggleButton = (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'inline-flex items-center gap-2 px-3 text-fs-300 font-semibold leading-none',
        'transition-colors duration-200 min-h-[42px] border-[1.5px]',
        focusRing,
        stateClasses,
        removable ? 'rounded-l-gj-pill border-r-0' : 'rounded-gj-pill',
        className,
      ].join(' ')}
      {...rest}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
    </button>
  )

  if (!removable) return toggleButton

  const removeLabel = `Retirer ${typeof children === 'string' ? children : 'le filtre'}`

  return (
    <span role="group" aria-label={removeLabel} className="inline-flex items-stretch">
      {toggleButton}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className={[
          'inline-flex items-center justify-center px-2 min-h-[42px] border-[1.5px] border-l-0',
          'rounded-r-gj-pill transition-colors duration-200',
          focusRing,
          stateClasses,
          'hover:bg-black/5 cursor-pointer',
        ].join(' ')}
      >
        <Icon name="close" size={14} />
      </button>
    </span>
  )
}
