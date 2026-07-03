import { isRichHtml } from '@/lib/rich-html'

interface RichContentProps {
  /** HTML déjà sanitisé côté serveur (sanitizeRichHtml à l'écriture), ou texte plat legacy. */
  html: string | null | undefined
  className?: string
}

/**
 * GUIC-505/507 — Rendu du corps riche des contenus (opportunités, événements,
 * ressources, offres…).
 *
 * - Si la valeur contient du HTML de la liste blanche → rendu stylé « gj-prose »
 *   (styles CJS bridés, cf. `styles/tokens.css`).
 * - Sinon (lignes existantes en texte brut) → fallback `whitespace-pre-line`,
 *   jamais de `dangerouslySetInnerHTML` sur du texte non balisé.
 *
 * ⚠️ Ce composant N'assainit PAS : la sanitisation se fait à l'écriture
 * (`sanitizeRichHtml`). Ne jamais lui passer d'HTML non sanitisé.
 */
export function RichContent({ html, className = '' }: RichContentProps) {
  if (!html) return null

  if (isRichHtml(html)) {
    return (
      <div
        data-rich-content="true"
        className={`gj-prose ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <div
      data-plain-text="true"
      className={`whitespace-pre-line text-color-text-primary ${className}`}
    >
      {html}
    </div>
  )
}
