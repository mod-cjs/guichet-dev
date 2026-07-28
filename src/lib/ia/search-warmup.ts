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

/**
 * Coût unitaire observé d'une vectorisation (mesure du 27/07 : 3 654 vecteurs en 1 020 s
 * sur `gemini-embedding-001`, une instance par requête). Sert à convertir un budget de
 * TEMPS en nombre de textes. Surchargeable si le modèle change.
 */
const COUT_UNITAIRE_MS = numEnv('YAYE_EMBEDDING_COUT_MS', 280)

/** Nouveaux textes vectorisés par nuit (garde-fou de volume). */
const WARMUP_MAX = numEnv('YAYE_SEARCH_WARMUP_MAX', 600)
/**
 * Budget de TEMPS du préchauffage. Un plafond en NOMBRE ne sait pas s'arrêter à l'heure :
 * le coût unitaire dépend du modèle (279 ms mesurés sur gemini-embedding-001) et le
 * catalogue grossit. La fonction cron, elle, a une durée maximale fixe.
 */
const WARMUP_BUDGET_MS = numEnv('YAYE_WARMUP_BUDGET_MS', 180_000)

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
 * Vectorise le RÉFÉRENTIEL DE COMPÉTENCES (vague 2.2). Le fallback Prisma — configuration
 * de production tant que Neo4j n'est pas provisionné — s'en sert sur le chemin de réponse,
 * en lecture de cache STRICTE. Sans ce préchauffage, l'appariement sémantique des
 * compétences resterait durablement muet. Quelques centaines de libellés : c'est rapide.
 */
export async function warmSkillVectors(): Promise<number> {
  if (!isEmbeddingEnabled()) return 0
  try {
    const skills = await prisma.skill.findMany({ select: { libelle: true } })
    const vecteurs = await embedTexts(skills.map(s => s.libelle), { maxNew: WARMUP_MAX })
    logger.info('[search-warmup] référentiel de compétences vectorisé', {
      libelles: skills.length,
      vecteurs: vecteurs.size,
    })
    return vecteurs.size
  } catch (err) {
    logger.warn('[search-warmup] référentiel non vectorisé (sans conséquence : lexical seul)', { err: String(err) })
    return 0
  }
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
    // Le budget de temps se traduit en nombre de textes, à partir du coût unitaire observé.
    const plafondTemps = Math.max(1, Math.floor(WARMUP_BUDGET_MS / COUT_UNITAIRE_MS))
    // MÊME tâche que la recherche (RETRIEVAL_DOCUMENT) : sinon les clés divergent et
    // le préchauffage ne sert à rien.
    const vecteurs = await embedTexts(textes, { maxNew: Math.min(WARMUP_MAX, plafondTemps), taskType: 'RETRIEVAL_DOCUMENT' })

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
