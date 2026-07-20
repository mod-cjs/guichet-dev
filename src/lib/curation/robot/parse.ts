/**
 * GUIC-597 — US-2 : extraction déterministe des URLs candidates (DÉCOUVERTE).
 *
 * Périmètre US-2 = obtenir la LISTE des liens d'annonces ; l'extraction fine des
 * champs (titre, deadline…) est US-3. On reste volontairement sans moteur DOM/CSS
 * (pas de dépendance cheerio/jsdom en prod) : les flux RSS/Atom/sitemap sont du XML
 * bien structuré, et pour le HTML on récolte les ancres `<a href>` (heuristique de
 * découverte classique d'un crawler), filtrables par un motif de lien issu de la
 * config de la source.
 */

/** Résout un lien (absolu ou relatif) contre une base, retourne null si inexploitable. */
function resoudre(lien: string, base: string): string | null {
  const l = lien.trim()
  if (!l || l.startsWith('#')) return null
  if (/^(javascript|mailto|tel):/i.test(l)) return null
  try {
    const u = new URL(l, base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

function dedup(liens: Array<string | null>): string[] {
  const vus = new Set<string>()
  const out: string[] = []
  for (const l of liens) {
    if (l && !vus.has(l)) {
      vus.add(l)
      out.push(l)
    }
  }
  return out
}

/** RSS `<link>texte</link>` + Atom `<link href="…">`. */
export function extraireLiensRss(xml: string, base: string): string[] {
  const liens: Array<string | null> = []
  // RSS 2.0 : <link>URL</link>
  for (const m of xml.matchAll(/<link>\s*([^<]+?)\s*<\/link>/gi)) {
    liens.push(resoudre(m[1], base))
  }
  // Atom : <link href="URL" .../>
  for (const m of xml.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\/?>/gi)) {
    liens.push(resoudre(m[1], base))
  }
  return dedup(liens)
}

/** Sitemap `<loc>URL</loc>`. */
export function extraireLiensSitemap(xml: string, base: string): string[] {
  const liens: Array<string | null> = []
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    liens.push(resoudre(m[1], base))
  }
  return dedup(liens)
}

/**
 * Listing HTML : ancres `<a href>` résolues en absolu. `motifLien` (optionnel) filtre
 * les liens dont l'URL contient la sous-chaîne fournie (ex. "/offres/").
 */
export function extraireLiensHtml(html: string, base: string, motifLien?: string): string[] {
  const liens: Array<string | null> = []
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    liens.push(resoudre(m[1], base))
  }
  const resolus = dedup(liens)
  return motifLien ? resolus.filter((l) => l.includes(motifLien)) : resolus
}
