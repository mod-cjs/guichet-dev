import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { ClientHttp } from '@/lib/curation/robot/http-client'
import { extraireOpportunite } from './extract'

/**
 * GUIC-598 — US-3 : orchestrateur d'extraction (phase 2 du cron veille).
 * Traite un lot borné d'items `decouvert` : fetch de l'annonce (garde SSRF via le client
 * réel), extraction déterministe, écriture de `payloadExtrait`/`titre`/`scoreCompletude`
 * et passage `decouvert → a_valider`. Jamais de rejet auto (score faible = à valider).
 */

export interface ExtractionDeps {
  client: ClientHttp
  maintenant?: () => Date
  attendre?: (ms: number) => Promise<void>
  delaiPolitesseMs?: number
  /** Taille du lot traité par exécution. */
  lotMax?: number
}

export interface RapportExtraction {
  itemsTraites: number
  nbErreurs: number
}

const attenteReelle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function executerExtraction(deps: ExtractionDeps): Promise<RapportExtraction> {
  const attendre = deps.attendre ?? attenteReelle
  const delai = deps.delaiPolitesseMs ?? 2000
  const lotMax = deps.lotMax ?? 20

  const items = await prisma.itemCuration.findMany({
    where: { statut: 'decouvert' },
    orderBy: { createdAt: 'asc' },
    take: lotMax,
    include: { source: { select: { typeDefautId: true, configExtraction: true } } },
  })

  let itemsTraites = 0
  let nbErreurs = 0

  for (const item of items) {
    if (itemsTraites > 0 || nbErreurs > 0) await attendre(delai) // politesse entre annonces
    try {
      const res = await deps.client(item.urlCanonique)
      if (res.statut < 200 || res.statut >= 300) throw new Error(`HTTP ${res.statut}`)

      const cfg = item.source.configExtraction as { champs?: Record<string, string> } | null
      const { champs, scoreCompletude } = extraireOpportunite(res.corps, {
        url: item.urlCanonique,
        typeDefautId: item.source.typeDefautId,
        champs: cfg?.champs,
      })

      await prisma.itemCuration.update({
        where: { id: item.id },
        data: {
          titre: champs.titre ?? null,
          payloadExtrait: champs as unknown as Prisma.InputJsonValue,
          scoreCompletude,
          statut: 'a_valider',
        },
      })
      itemsTraites += 1
    } catch (err) {
      nbErreurs += 1
      logger.error('curation.extraction.item_erreur', {
        itemId: item.id,
        error: err instanceof Error ? err.message : String(err),
      })
      // On laisse l'item en `decouvert` : retenté au prochain passage.
    }
  }

  logger.info('curation.extraction.termine', { itemsTraites, nbErreurs })
  return { itemsTraites, nbErreurs }
}
