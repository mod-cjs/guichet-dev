/**
 * GUIC-598 — US-3 : nettoyage texte partagé par les extracteurs.
 * Retire les balises HTML résiduelles et normalise les espaces/entités courantes.
 */
const ENTITES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

export function nettoyerTexte(brut: string | null | undefined): string {
  if (!brut) return ''
  return brut
    .replace(/<[^>]{0,2000}>/g, ' ') // balises (borné → anti-ReDoS)
    .replace(/&#(\d{1,7});/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, (e) => ENTITES[e.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
