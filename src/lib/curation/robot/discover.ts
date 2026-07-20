import type { SourceVeille } from '@prisma/client'
import type { ClientHttp } from './http-client'
import { USER_AGENT_ROBOT } from './http-client'
import { analyserRobots } from './robots'
import { extraireLiensRss, extraireLiensSitemap, extraireLiensHtml } from './parse'

/**
 * GUIC-597 — US-2 : découverte des liens candidats d'UNE source (listing seul).
 * Respecte robots.txt. Ne fetch PAS chaque annonce (extraction = US-3).
 */

export interface Decouverte {
  liens: string[]
  bloqueParRobots: boolean
  crawlDelayMs: number | null
}

function motifLien(source: SourceVeille): string | undefined {
  const cfg = source.configExtraction as Record<string, unknown> | null
  const m = cfg?.motifLien
  return typeof m === 'string' && m ? m : undefined
}

/** Choix du parseur selon la méthode ; `auto` = cascade RSS → sitemap → HTML. */
function extraire(source: SourceVeille, corps: string): string[] {
  const base = source.url
  switch (source.methode) {
    case 'rss':
      return extraireLiensRss(corps, base)
    case 'html_selecteurs':
      return extraireLiensHtml(corps, base, motifLien(source))
    case 'jsonld':
    case 'api':
    case 'article_regex':
    case 'auto':
    default: {
      const rss = extraireLiensRss(corps, base)
      if (rss.length) return rss
      const sitemap = extraireLiensSitemap(corps, base)
      if (sitemap.length) return sitemap
      return extraireLiensHtml(corps, base, motifLien(source))
    }
  }
}

export async function decouvrirSource(source: SourceVeille, client: ClientHttp): Promise<Decouverte> {
  const origine = new URL(source.url).origin
  const chemin = new URL(source.url).pathname

  // 1) robots.txt (fail-open : robots injoignable → on n'interdit pas).
  let crawlDelayMs: number | null = null
  try {
    const robots = await client(`${origine}/robots.txt`)
    if (robots.statut >= 200 && robots.statut < 300) {
      const info = analyserRobots(robots.corps, USER_AGENT_ROBOT)
      crawlDelayMs = info.crawlDelayMs
      if (!info.estAutorise(chemin)) {
        return { liens: [], bloqueParRobots: true, crawlDelayMs }
      }
    }
  } catch {
    /* robots injoignable → on continue */
  }

  // 2) listing.
  const res = await client(source.url)
  if (res.statut < 200 || res.statut >= 300) {
    throw new Error(`HTTP ${res.statut} sur ${source.url}`)
  }
  return { liens: extraire(source, res.corps), bloqueParRobots: false, crawlDelayMs }
}
