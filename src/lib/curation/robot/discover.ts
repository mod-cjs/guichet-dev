import type { SourceVeille } from '@prisma/client'
import type { ClientHttp } from './http-client'
import { USER_AGENT_ROBOT } from './http-client'
import { analyserRobots } from './robots'
import { extraireLiensRss, extraireLiensSitemap, extraireLiensHtml, ressembleAFlux } from './parse'

/**
 * GUIC-597 — US-2 : découverte des liens candidats d'UNE source (listing seul).
 * Respecte robots.txt et applique le délai de politesse ENTRE les deux requêtes du
 * MÊME hôte (robots.txt puis listing). Ne fetch PAS chaque annonce (extraction = US-3).
 */

export interface Decouverte {
  liens: string[]
  bloqueParRobots: boolean
  crawlDelayMs: number | null
}

export interface OptionsDecouverte {
  /** Attente de politesse (tests : no-op). Défaut : no-op. */
  attendre?: (ms: number) => Promise<void>
  /** Délai de politesse par défaut entre requêtes au même hôte (ms). */
  delaiPolitesseMs?: number
}

function motifLien(source: SourceVeille): string | undefined {
  const cfg = source.configExtraction as Record<string, unknown> | null
  const m = cfg?.motifLien
  return typeof m === 'string' && m ? m : undefined
}

/** Choix du parseur ; `auto` = flux (RSS/sitemap) si le corps EN EST un, sinon ancres HTML. */
function extraire(source: SourceVeille, corps: string): string[] {
  const base = source.url
  switch (source.methode) {
    case 'rss':
      return extraireLiensRss(corps, base)
    case 'html_selecteurs':
      return extraireLiensHtml(corps, base, motifLien(source))
    default: {
      // `auto` (et jsonld/api/article_regex en attendant US-3) : ne tenter le parsing de
      // flux QUE si le corps ressemble vraiment à un flux/sitemap — sinon on prend les
      // ancres HTML (évite de confondre <link rel=stylesheet> avec un lien de flux).
      if (ressembleAFlux(corps)) {
        const rss = extraireLiensRss(corps, base)
        if (rss.length) return rss
        const sitemap = extraireLiensSitemap(corps, base)
        if (sitemap.length) return sitemap
      }
      return extraireLiensHtml(corps, base, motifLien(source))
    }
  }
}

export async function decouvrirSource(
  source: SourceVeille,
  client: ClientHttp,
  opts: OptionsDecouverte = {},
): Promise<Decouverte> {
  const attendre = opts.attendre ?? (async () => {})
  const delaiDefaut = opts.delaiPolitesseMs ?? 2000
  const origine = new URL(source.url).origin
  const chemin = new URL(source.url).pathname

  // 1) robots.txt (fail-open : robots injoignable → on n'interdit pas).
  let crawlDelayMs: number | null = null
  let robotsLu = false
  try {
    const robots = await client(`${origine}/robots.txt`)
    if (robots.statut >= 200 && robots.statut < 300) {
      robotsLu = true
      const info = analyserRobots(robots.corps, USER_AGENT_ROBOT)
      crawlDelayMs = info.crawlDelayMs
      if (!info.estAutorise(chemin)) {
        return { liens: [], bloqueParRobots: true, crawlDelayMs }
      }
    }
  } catch {
    /* robots injoignable → on continue */
  }

  // Politesse ENTRE les deux requêtes du même hôte : Crawl-delay si supérieur au défaut.
  await attendre(Math.max(delaiDefaut, crawlDelayMs ?? 0))
  void robotsLu

  // 2) listing.
  const res = await client(source.url)
  if (res.statut < 200 || res.statut >= 300) {
    throw new Error(`HTTP ${res.statut} sur ${source.url}`)
  }
  return { liens: extraire(source, res.corps), bloqueParRobots: false, crawlDelayMs }
}
