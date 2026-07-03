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
