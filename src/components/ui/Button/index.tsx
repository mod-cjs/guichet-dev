import { ButtonHTMLAttributes } from 'react'

/**
 * `conversion` (design v5, GUIC-691) — CTA de conversion : Postuler, S'inscrire,
 * Valider, Déposer. Seule variante autorisée à porter le magenta `--gj-action`.
 * `primary` reste le teal de marque et de navigation : ne jamais intervertir les
 * deux, c'est la règle la plus structurante du handoff v5.
 */
type ButtonVariant = 'primary' | 'conversion' | 'secondary' | 'ghost' | 'text' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  // `primary` = action générique / navigation (teal) — jamais la couleur de conversion.
  primary:   'bg-gj-teal text-white hover:bg-gj-teal-deep',
  // `.gj-cta` (tokens.css) porte déjà fond, taille, hauteur de cible et hover.
  conversion: 'gj-cta',
  secondary: 'bg-gj-yellow text-gj-ink hover:opacity-90',
  ghost:     'bg-white text-gj-teal-deep border-[1.5px] border-gj-teal-deep hover:bg-gj-teal-soft',
  text:      'bg-transparent text-gj-teal font-bold px-1 hover:underline',
  danger:    'bg-gj-red text-white hover:opacity-90',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-space-3 text-fs-200 min-h-[var(--tap-min)] md:min-h-[var(--tap-dense)]',
  md: 'px-space-4 text-fs-300 min-h-[var(--tap-min)]',
  lg: 'px-space-5 text-fs-400 min-h-[var(--tap-comfortable)]',
}

export function Button({
  variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-gj-md font-bold
        transition-colors duration-200 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${variant === 'conversion' ? '' : SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {children}
    </button>
  )
}
