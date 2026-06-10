/**
 * <CentreOpenDot> — pastille d'état d'ouverture d'un centre CJS.
 *
 * Sémantique a11y : `role="status"` + `aria-label` explicite ("Ouvert" / "Fermé"
 * ou label override). Couleurs via tokens CSS `--gj-teal` (ouvert) / `--gj-red`
 * (fermé). Pas d'animation par défaut (`prefers-reduced-motion` safe).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` — Wave 1
 */
export interface CentreOpenDotProps {
  /** true → vert (ouvert), false → rouge (fermé). */
  open: boolean
  /** Override du `aria-label`. Défaut : "Ouvert" ou "Fermé". */
  label?: string
  /** Classes utilitaires additionnelles. */
  className?: string
}

export function CentreOpenDot({ open, label, className = '' }: CentreOpenDotProps) {
  const ariaLabel = label ?? (open ? 'Ouvert' : 'Fermé')
  const bgClass = open ? 'bg-gj-teal' : 'bg-gj-red'
  const bgVar = open ? 'var(--gj-teal)' : 'var(--gj-red)'

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      data-open={open ? 'true' : 'false'}
      className={`inline-block w-2 h-2 rounded-full ${bgClass} ${className}`.trim()}
      style={{ background: bgVar }}
    />
  )
}
