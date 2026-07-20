/**
 * GUIC-597 — US-2 : extraction déterministe des URLs candidates (DÉCOUVERTE).
 *
 * Périmètre US-2 = obtenir la LISTE des liens d'annonces ; l'extraction fine des
 * champs (titre, deadline…) est US-3. Pas de moteur DOM/CSS en prod (aucune dép
 * cheerio/jsdom) : RSS/Atom/sitemap sont du XML structuré, et pour le HTML on récolte
 * les ancres `<a href>`.
 *
 * Durcissement (revue adverse 2026-07-20) :
 *  - Toutes les regex sont LINÉAIRES et BORNÉES (`{0,N}`, pas de quantificateurs
 *    adjacents recouvrants) → pas de ReDoS sur contenu tiers hostile.
 *  - Le parsing RSS/Atom est SCOPÉ aux éléments `<item>`/`<entry>` : on ne confond plus
 *    un `<link rel="stylesheet" href>` de page HTML avec un lien de flux. Les liens de
 *    `<channel>`/`self` (hors item/entry) sont exclus.
 */

const MAX_URL = 500 // aligné sur VARCHAR(500) de items_curation.url_canonique
const MAX_BLOC = 20_000 // borne d'un item/entry pour la découverte

function resoudre(lien: string, base: string): string | null {
  const l = lien.trim()
  if (!l || l.startsWith('#')) return null
  if (/^(javascript|mailto|tel|data):/i.test(l)) return null
  try {
    const u = new URL(l, base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const s = u.toString()
    return s.length <= MAX_URL ? s : null // borne longueur (contenu tiers non fiable)
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

/** Vrai si le corps ressemble à un flux/sitemap XML (pilote la cascade `auto`). */
export function ressembleAFlux(corps: string): boolean {
  const tete = corps.slice(0, 1000).toLowerCase()
  return /<rss[\s>]|<feed[\s>]|<urlset[\s>]|<sitemapindex[\s>]/.test(tete)
}

/** RSS `<item>…<link>URL</link>…</item>` + Atom `<entry>…<link href="URL"/>…</entry>`. */
export function extraireLiensRss(xml: string, base: string): string[] {
  const liens: Array<string | null> = []

  // RSS : liens à l'intérieur d'un <item> uniquement (exclut le <link> du <channel>).
  for (const item of xml.matchAll(/<item[\s>][\s\S]{0,20000}?<\/item>/gi)) {
    const bloc = item[0].slice(0, MAX_BLOC)
    const m = bloc.match(/<link>([^<]{0,500})<\/link>/i)
    if (m) liens.push(resoudre(m[1], base))
  }

  // Atom : liens à l'intérieur d'un <entry> uniquement.
  for (const entry of xml.matchAll(/<entry[\s>][\s\S]{0,20000}?<\/entry>/gi)) {
    const bloc = entry[0].slice(0, MAX_BLOC)
    // Priorité au rel="alternate" ; sinon premier <link href>.
    const alt = bloc.match(/<link\b[^>]{0,300}\brel=["']alternate["'][^>]{0,300}\bhref=["']([^"']{0,500})["']/i)
      || bloc.match(/<link\b[^>]{0,300}\bhref=["']([^"']{0,500})["'][^>]{0,300}\brel=["']alternate["']/i)
      || bloc.match(/<link\b[^>]{0,300}\bhref=["']([^"']{0,500})["']/i)
    if (alt) liens.push(resoudre(alt[1], base))
  }

  return dedup(liens)
}

/** Sitemap `<loc>URL</loc>`. */
export function extraireLiensSitemap(xml: string, base: string): string[] {
  const liens: Array<string | null> = []
  for (const m of xml.matchAll(/<loc>([^<]{0,500})<\/loc>/gi)) {
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
  for (const m of html.matchAll(/<a\b[^>]{0,1000}\bhref\s*=\s*["']([^"']{0,500})["']/gi)) {
    liens.push(resoudre(m[1], base))
  }
  const resolus = dedup(liens)
  return motifLien ? resolus.filter((l) => l.includes(motifLien)) : resolus
}
