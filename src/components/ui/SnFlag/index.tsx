/**
 * SnFlag — drapeau du Sénégal (SVG).
 *
 * Primitive utilisée à côté des inputs téléphone pour signifier l'indicatif
 * +221. Remplace l'ancien `<span>SN</span>` textuel pour aligner avec les
 * standards d'accessibilité et de design v2.
 *
 * Trois bandes verticales (vert / jaune / rouge) + étoile verte centrée
 * sur la bande jaune, conforme spécifications officielles du drapeau.
 */
export interface SnFlagProps {
  /** Largeur en pixels. Défaut 16. La hauteur suit le ratio 3:2. */
  size?: number
  className?: string
}

export function SnFlag({ size = 16, className }: SnFlagProps) {
  return (
    <svg
      width={size}
      height={(size * 2) / 3}
      viewBox="0 0 30 20"
      className={className}
      role="img"
      aria-label="Drapeau du Sénégal"
    >
      <rect width="10" height="20" fill="#00853F" />
      <rect x="10" width="10" height="20" fill="#FDEF42" />
      <rect x="20" width="10" height="20" fill="#E31B23" />
      <path
        d="M15 7l1.176 3.618h3.804l-3.078 2.236 1.176 3.618L15 14.236l-3.078 2.236 1.176-3.618-3.078-2.236h3.804z"
        fill="#00853F"
      />
    </svg>
  )
}
