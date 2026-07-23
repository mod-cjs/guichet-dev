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
 * <Switch /> — interrupteur accessible (GUIC-581).
 * Stub RED — implémentation dans le commit GREEN.
 */
export function Switch(_props: SwitchProps) {
  return null
}
