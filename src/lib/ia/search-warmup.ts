// Préchauffage des vecteurs du catalogue (GUIC-683).
//
// La recherche ne vectorise RIEN à chaud : elle lit le cache. C'est ici qu'on le remplit,
// hors ligne, dans le cron nocturne — de sorte qu'une recherche d'usager coûte toujours un
// seul aller-retour (sa requête) et jamais N (le catalogue).
//
// ⚠️ BUDGET DE TEMPS : `gemini-embedding-001` n'accepte qu'UNE instance par requête. Avec
// quelques milliers d'offres, tout vectoriser d'un coup dépasserait la durée maximale du
// cron. On procède donc par lots, en commençant par les offres les PLUS RÉCENTES — celles
// qu'on cherche — et le catalogue se complète en quelques nuits. Les offres non encore
// vectorisées restent trouvables par la voie lexicale : aucune régression pendant la montée.
//
// Sur `text-multilingual-embedding-002` (lots réels), le préchauffage complet tient en une
// seule nuit.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { embedTexts, isEmbeddingEnabled, normalizeForEmbedding } from './embeddings'
import { numEnv } from './env'

/** Nouveaux textes vectorisés par nuit (borne le temps passé dans le cron). */
const WARMUP_MAX = numEnv('YAYE_SEARCH_WARMUP_MAX', 600)

export interface WarmupReport {
  /** Textes soumis au préchauffage (déjà en cache ou non). */
  candidats: number
  /**
   * Textes DISTINCTS après normalisation — la vraie cible à atteindre. Deux offres au
   * même intitulé partagent un seul vecteur : sans cette borne, `vecteurs` n'égale jamais
   * `candidats` et un appelant croit à tort que le préchauffage patine.
   */
  uniques: number
  /** Vecteurs disponibles à l'issue (cache + nouvellement calculés). */
  vecteurs: number
  /** Vrai quand tous les textes distincts ont leur vecteur. */
  complet: boolean
  dureeMs: number
}

/**
 * Texte représentatif d'une offre — DOIT rester identique à celui utilisé par la recherche,
 * sinon les clés de cache divergent et le préchauffage ne sert à rien.
 *
 * On ENRICHIT le titre du domaine et du type (mesure locale du 2026-07-27) : un titre nu
 * est trop court pour se vectoriser proprement, et les scores s'écrasent — « Développeur
 * web junior » ne se détachait pas du bruit sur la requête « sites web ». Le domaine et le
 * type sont des mots-clés métier stables, qui ancrent le document dans son champ.
 */
export function texteOpportunite(o: {
  titre: string
  organisationLibelle?: string | null
  organisation?: string | null
  domaine?: string | null
  type?: string | null
}): string {
  const parts = [o.titre, o.organisationLibelle ?? o.organisation ?? '', o.domaine ?? '', o.type ?? '']
  return parts.filter(Boolean).join(' · ').trim()
}

/**
 * Vectorise les titres d'opportunités publiées, des plus récentes aux plus anciennes.
 * No-op si les embeddings sont coupés. Ne lève jamais (le cron ne doit pas échouer pour ça).
 */
export async function warmOpportuniteVectors(): Promise<WarmupReport> {
  const debut = Date.now()
  if (!isEmbeddingEnabled()) return { candidats: 0, uniques: 0, vecteurs: 0, complet: true, dureeMs: 0 }

  try {
    const offres = await prisma.opportunite.findMany({
      where: {
        statut: 'publiee',
        deletedAt: null,
        OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
      },
      select: { titre: true, organisation: true, organisationLibelle: true, domaine: true, type: true },
      orderBy: { createdAt: 'desc' },
    })

    const textes = offres.map(texteOpportunite).filter(Boolean)
    // MÊME tâche que la recherche (RETRIEVAL_DOCUMENT) : sinon les clés divergent et
    // le préchauffage ne sert à rien.
    const vecteurs = await embedTexts(textes, { maxNew: WARMUP_MAX, taskType: 'RETRIEVAL_DOCUMENT' })

    const uniques = new Set(textes.map(normalizeForEmbedding).filter(Boolean)).size
    const rapport: WarmupReport = {
      candidats: textes.length,
      uniques,
      vecteurs: vecteurs.size,
      complet: vecteurs.size >= uniques,
      dureeMs: Date.now() - debut,
    }
    logger.info('[search-warmup] catalogue vectorisé', { ...rapport })
    return rapport
  } catch (err) {
    logger.warn('[search-warmup] échec (sans conséquence : la recherche reste lexicale)', { err: String(err) })
    return { candidats: 0, uniques: 0, vecteurs: 0, complet: false, dureeMs: Date.now() - debut }
  }
}
