import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { ClientHttp } from '@/lib/curation/robot/http-client'
import { analyserRobots } from '@/lib/curation/robot/robots'
import { USER_AGENT_ROBOT } from '@/lib/curation/robot/http-client'
import { extraireOpportunite, calculerScore } from './extract'
import { enrichirParIa } from './enrichir-ia'
import { nettoyerTexte } from './html-texte'
import type { ChampsExtraits } from './types'

/**
 * GUIC-598 — US-3 : orchestrateur d'extraction (phase 2 du cron veille).
 * Traite un lot borné d'items `decouvert` : fetch de l'annonce (garde SSRF via le client
 * réel), extraction déterministe, écriture de `payloadExtrait`/`titre`/`scoreCompletude`
 * et passage `decouvert → a_valider`. Jamais de rejet auto (score faible = à valider).
 *
 * Durcissement (revue adverse 2026-07-20) :
 *  - Anti-famine : `nbTentatives` + escalade vers `en_attente` au-delà du seuil → les
 *    items « poison » (404, inparsables) quittent la fenêtre de sélection.
 *  - robots.txt revérifié par HÔTE (le chemin d'un item peut être Disallow).
 *  - Budget temps : arrêt propre avant `maxDuration`.
 *  - Schéma d'URL re-validé (http/https) avant fetch.
 *  - Type déduit du @type schema.org (slug → OpportuniteType) si la source n'impose rien.
 */

const TENTATIVES_MAX = 3
const LOT_DEFAUT = 10
const BUDGET_MS_DEFAUT = 240_000 // marge sous maxDuration=300 (phase 1 incluse en amont)
const SEUIL_ENRICHISSEMENT = 70 // en-dessous → item « faible » → candidat à l'enrichissement IA

/** Un item mérite l'enrichissement IA s'il lui manque un champ que le LLM sait combler. */
function aBesoinEnrichissement(c: ChampsExtraits): boolean {
  return (
    calculerScore(c) < SEUIL_ENRICHISSEMENT ||
    !c.deadline ||
    !c.region ||
    (!c.typeId && !c.typeSlugSchemaOrg)
  )
}

export interface ExtractionDeps {
  client: ClientHttp
  maintenant?: () => Date
  attendre?: (ms: number) => Promise<void>
  delaiPolitesseMs?: number
  lotMax?: number
  budgetMs?: number
  /** Restreint le traitement à ces sources (isolation des tests parallèles). Undefined = global (prod). */
  sourceIds?: string[]
  /** Seam d'enrichissement IA (tests). Fournir cette fn ACTIVE l'enrichissement quel que soit l'env. */
  enrichir?: typeof enrichirParIa
}

export interface RapportExtraction {
  itemsTraites: number
  nbErreurs: number
  nbEscalades: number
}

const attenteReelle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Cache de robots.txt par hôte pour la durée du run (une requête robots par hôte). */
function faiseurRobots(client: ClientHttp) {
  const cache = new Map<string, { estAutorise(path: string): boolean }>()
  return async (url: string): Promise<boolean> => {
    let u: URL
    try {
      u = new URL(url)
    } catch {
      return false
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    let info = cache.get(u.origin)
    if (!info) {
      try {
        const r = await client(`${u.origin}/robots.txt`)
        info =
          r.statut >= 200 && r.statut < 300
            ? analyserRobots(r.corps, USER_AGENT_ROBOT)
            : { estAutorise: () => true }
      } catch {
        info = { estAutorise: () => true } // robots injoignable → fail-open
      }
      cache.set(u.origin, info)
    }
    return info.estAutorise(u.pathname)
  }
}

async function resoudreTypeId(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined
  const t = await prisma.opportuniteType.findFirst({ where: { slug, actif: true }, select: { id: true } })
  return t?.id
}

export async function executerExtraction(deps: ExtractionDeps): Promise<RapportExtraction> {
  const maintenant = deps.maintenant ?? (() => new Date())
  const attendre = deps.attendre ?? attenteReelle
  const delai = deps.delaiPolitesseMs ?? 2000
  const lotMax = deps.lotMax ?? LOT_DEFAUT
  const budgetMs = deps.budgetMs ?? BUDGET_MS_DEFAUT
  const debut = maintenant().getTime()
  const robotsAutorise = faiseurRobots(deps.client)

  // Enrichissement IA : activé si un seam est injecté (tests) OU par opt-in env (prod).
  // Fail-soft intégral côté module → jamais bloquant. Types connus chargés une fois par run.
  const enrichir = deps.enrichir ?? enrichirParIa
  const enrichirActif = Boolean(deps.enrichir) || process.env.CURATION_ENRICHISSEMENT_IA === '1'
  const typesConnus = enrichirActif
    ? (await prisma.opportuniteType.findMany({ where: { actif: true }, select: { slug: true } })).map((t) => t.slug)
    : []

  const items = await prisma.itemCuration.findMany({
    where: {
      statut: 'decouvert',
      nbTentatives: { lt: TENTATIVES_MAX },
      ...(deps.sourceIds ? { sourceId: { in: deps.sourceIds } } : {}),
    },
    orderBy: [{ nbTentatives: 'asc' }, { createdAt: 'asc' }],
    take: lotMax,
    include: { source: { select: { typeDefautId: true, configExtraction: true } } },
  })

  let itemsTraites = 0
  let nbErreurs = 0
  let nbEscalades = 0

  for (const item of items) {
    if (maintenant().getTime() - debut > budgetMs) break // arrêt propre avant maxDuration
    if (itemsTraites > 0 || nbErreurs > 0) await attendre(delai)

    try {
      if (!/^https?:\/\//i.test(item.urlCanonique)) throw new Error('Schéma URL non http(s)')
      if (!(await robotsAutorise(item.urlCanonique))) throw new Error('Interdit par robots.txt')

      const res = await deps.client(item.urlCanonique)
      if (res.statut < 200 || res.statut >= 300) throw new Error(`HTTP ${res.statut}`)

      const cfg = item.source.configExtraction as { champs?: Record<string, string> } | null
      const { champs } = extraireOpportunite(res.corps, {
        url: item.urlCanonique,
        champs: cfg?.champs,
        // typeDefautId NON transmis : le type de CONTENU (schema.org puis LLM) prime ; le
        // typeDefaut de la source est appliqué en filet FINAL ci-dessous → type par item.
      })

      // Enrichissement IA (hybride) : comble les trous du déterministe sur les items faibles.
      if (enrichirActif && aBesoinEnrichissement(champs)) {
        const enrichi = await enrichir(
          { texte: nettoyerTexte(res.corps), url: item.urlCanonique, dejaConnu: champs },
          { typesConnus },
        )
        if (Object.keys(enrichi).length > 0) {
          Object.assign(champs, enrichi) // module déjà « trous-seulement » → pas d'écrasement
          champs.enrichiParIa = true
        }
      }

      // Type : contenu (schema.org OU LLM) → id ; sinon filet FINAL = typeDefaut de la source.
      if (!champs.typeId && champs.typeSlugSchemaOrg) {
        const id = await resoudreTypeId(champs.typeSlugSchemaOrg)
        if (id) champs.typeId = id
      }
      if (!champs.typeId && item.source.typeDefautId) champs.typeId = item.source.typeDefautId

      await prisma.itemCuration.update({
        where: { id: item.id },
        data: {
          titre: champs.titre ?? null,
          payloadExtrait: champs as unknown as Prisma.InputJsonValue,
          scoreCompletude: calculerScore(champs),
          statut: 'a_valider',
        },
      })
      itemsTraites += 1
    } catch (err) {
      nbErreurs += 1
      const tentatives = item.nbTentatives + 1
      const escalade = tentatives >= TENTATIVES_MAX
      if (escalade) nbEscalades += 1
      await prisma.itemCuration.update({
        where: { id: item.id },
        // Au-delà du seuil : `en_attente` → sort de la file `decouvert` (anti-famine),
        // reste visible pour un traitement manuel admin (US-5).
        data: { nbTentatives: tentatives, ...(escalade ? { statut: 'en_attente' } : {}) },
      })
      logger.error('curation.extraction.item_erreur', {
        itemId: item.id,
        tentatives,
        escalade,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  logger.info('curation.extraction.termine', { itemsTraites, nbErreurs, nbEscalades })
  return { itemsTraites, nbErreurs, nbEscalades }
}
