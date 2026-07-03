/**
 * GUIC-503/505 — Helpers PURS du contenu riche (aucune dépendance node).
 *
 * Isolé de `sanitize-html.ts` (qui importe le paquet `sanitize-html`, réservé au
 * serveur) pour rester importable côté client sans alourdir le bundle — utilisé par
 * le composant de rendu `RichContent`, mono-source de la liste blanche.
 */

/** Balises de la mise en forme bridée CJS — miroir éditeur ↔ sanitizer ↔ rendu. */
export const RICH_ALLOWED_TAGS = [
  'p', 'br',
  'h2', 'h3',
  'strong', 'em',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote',
] as const

/**
 * Détecte si une valeur stockée est du HTML riche ou du texte plat.
 * Garde côté rendu : les lignes existantes (texte brut) retombent sur un affichage
 * `whitespace-pre-line` plutôt que `dangerouslySetInnerHTML`. Un `<` isolé
 * (ex. "Prix < 100") ne matche pas et reste traité comme texte plat.
 */
export function isRichHtml(value: string | null | undefined): boolean {
  if (!value) return false
  return new RegExp(`<(${RICH_ALLOWED_TAGS.join('|')})\\b[^>]*>`, 'i').test(value)
}

/**
 * Convertit un corps riche (ou texte plat) en texte brut — pour les meta SEO
 * (`description.slice(0, 160)`), aperçus et partages où l'HTML n'a pas sa place.
 * Retire les balises, décode quelques entités courantes et normalise les espaces.
 */
export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, ' ') // sauts de bloc → espace
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '') // toutes les balises restantes
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
