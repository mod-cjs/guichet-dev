import type { KeyboardEvent } from 'react'

export interface SwitchProps {
  /** État courant (composant contrôlé). */
  checked: boolean
  /** Callback avec la valeur inversée. */
  onChange: (next: boolean) => void
  /** Désactive toute interaction. */
  disabled?: boolean
  /** Nom accessible — obligatoire (le switch n'a pas de label visible). */
  'aria-label': string
}

/**
 * <Switch /> — interrupteur accessible (GUIC-581, design v4 Lot 4).
 *
 * - rôle `switch` + `aria-checked` (annonce « activé/désactivé » aux lecteurs d'écran)
 * - piste 46×27, pouce blanc animé — teal actif / line-strong inactif
 * - clavier : Espace et Entrée basculent (handler explicite, jsdom-testable)
 * - contrôlé uniquement : l'état vit chez l'appelant (page Inclusion)
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const toggle = () => {
    if (!disabled) onChange(!checked)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={toggle}
      onKeyDown={onKeyDown}
      className={[
        'relative inline-flex w-[46px] h-[27px] shrink-0 rounded-gj-pill border-0 p-0',
        'transition-colors duration-150 cursor-pointer',
        'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
        checked ? 'bg-gj-teal' : 'bg-gj-line-strong',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'absolute top-[3px] w-[21px] h-[21px] rounded-full bg-gj-surface',
          'shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-[left] duration-150',
          checked ? 'left-[22px]' : 'left-[3px]',
        ].join(' ')}
      />
    </button>
  )
}
