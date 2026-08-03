/**
 * Consultations multicanal — GUIC-688.
 * Spec : `.agent_context/specs/GUIC-688-consultations-multicanal.md`.
 *
 * Trace unifiée « qui a vu quoi, par quel canal » pour les éléments consultables
 * par un bénéficiaire, sur les trois canaux (web, chat IA, WhatsApp).
 *
 * POURQUOI UN HELPER UNIQUE
 * Avant ce module, chaque module comptait à sa façon : `Opportunite.vues`
 * (dédoublonné par IP), `Ressource.vues` (pas de dédoublonnage du tout),
 * `CentreEvent.centre_viewed` (événementiel), et rien du tout pour les
 * événements, les livres, l'IA et WhatsApp. Trois modèles de comptage
 * différents ne s'agrègent pas : les volumes n'étaient comparables ni entre
 * entités, ni entre canaux.
 *
 * DEUX ÉVÉNEMENTS DISTINCTS
 * - `impression`   : l'élément a été AFFICHÉ (card Yaye, liste WhatsApp)
 * - `consultation` : l'élément a été OUVERT (page détail)
 * Ne jamais les additionner — un taux de conversion se calcule de l'un vers
 * l'autre.
 *
 * GARANTIES
 * - Fail-soft absolu : aucune erreur ne remonte au callsite, jamais.
 * - Aucune IP en clair en base : le sujet est toujours haché.
 * - Dédoublonnage identique sur les trois canaux (30 min), sinon les volumes
 *   restent incomparables.
 */

import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

/** Entités traçables. `programme`/`organisation` : déclarés, pas encore instrumentés. */
export const ENTITES_CONSULTABLES = [
  'opportunite',
  'ressource',
  'evenement',
  'centre',
  'livre',
  'programme',
  'organisation',
] as const

export const TYPES_CONSULTATION = ['impression', 'consultation'] as const

export const CANAUX_CONSULTATION = ['web', 'ia_web', 'whatsapp'] as const

/** D'où vient la vue — sert à distinguer une reco IA d'une recherche libre. */
export const ORIGINES_CONSULTATION = [
  'reco_ia',
  'recherche',
  'favoris',
  'notification',
  'direct',
  'ia',
  'wa',
] as const

export type EntiteConsultableValue = (typeof ENTITES_CONSULTABLES)[number]
export type TypeConsultationValue = (typeof TYPES_CONSULTATION)[number]
export type CanalConsultationValue = (typeof CANAUX_CONSULTATION)[number]
export type OrigineConsultationValue = (typeof ORIGINES_CONSULTATION)[number]

/**
 * Fenêtre de dédoublonnage : 30 min. Alignée sur la valeur historique du
 * compteur des opportunités — changer cette constante rend les séries
 * antérieures incomparables aux nouvelles.
 */
export const CONSULTATION_DEDUP_TTL_SECONDS = 1800

/**
 * Entités portant un compteur dénormalisé `vues`, conservé comme cache de
 * lecture pour les dashboards recruteur/admin déjà en place.
 */
const COMPTEURS_DENORMALISES: Partial<Record<EntiteConsultableValue, 'opportunite' | 'ressource'>> = {
  opportunite: 'opportunite',
  ressource:   'ressource',
}

const CJS_UID_RE = /^[a-zA-Z0-9_-]{1,64}$/

export const ConsultationInputSchema = z.object({
  typeEntite: z.enum(ENTITES_CONSULTABLES),
  entiteId:   z.string().min(1).max(36),
  typeEvent:  z.enum(TYPES_CONSULTATION),
  canal:      z.enum(CANAUX_CONSULTATION),
  cjsUid:     z.string().regex(CJS_UID_RE).optional(),
  /** Utilisée uniquement pour dériver le sujet des visiteurs anonymes — jamais stockée. */
  ip:         z.string().max(64).optional(),
  /**
   * Complète l'IP pour distinguer les visiteurs anonymes. Sans lui, un
   * environnement où le proxy n'injecte pas l'IP ferait partager UN seul sujet
   * à tout le trafic anonyme : la garde de 30 min n'enregistrerait alors qu'une
   * consultation pour l'ensemble des visiteurs. Jamais stocké, seulement haché.
   */
  userAgent:  z.string().max(512).optional(),
  origine:    z.enum(ORIGINES_CONSULTATION).optional(),
  sessionId:  z.string().max(36).optional(),
})

export type ConsultationInput = z.infer<typeof ConsultationInputSchema>

/**
 * Sel du hachage. Sans variable d'environnement, on retombe sur une constante :
 * le hash reste stable et non réversible en pratique, mais un sel dédié est
 * recommandé en production (une même IP produit sinon le même hash entre
 * environnements).
 */
const SEL = process.env.CONSULTATION_HASH_SALT ?? 'guichet-jeunesse-consultations'

/** SHA-256 salé du sujet (cjsUid ou IP). Aucune IP ne quitte ce module en clair. */
export function hashSujet(sujet: string): string {
  return createHash('sha256').update(`${SEL}:${sujet}`).digest('hex')
}

/**
 * Traduit le paramètre d'URL `?src=` en canal.
 * Les liens émis par Yaye portent `src=ia` (cards du chat web) ou `src=wa`
 * (messages WhatsApp) : sans ça, un clic depuis WhatsApp retombe dans le
 * trafic web organique, sans attribution possible.
 */
export function canalFromSrc(src?: string | null): CanalConsultationValue {
  if (src === 'ia') return 'ia_web'
  if (src === 'wa') return 'whatsapp'
  return 'web'
}

/** Clé de garde — impression et consultation sont dédoublonnées séparément. */
function cleDedup(input: ConsultationInput, sujetHash: string): string {
  return `consult:${input.typeEvent}:${input.typeEntite}:${input.entiteId}:${sujetHash}`
}

/**
 * Met à jour le cache dénormalisé `vues`. Best-effort et isolé : si l'update
 * échoue (ligne supprimée, verrou), la consultation reste enregistrée — la
 * table est la source de vérité, le compteur n'est qu'un cache.
 */
async function incrementerCache(input: ConsultationInput): Promise<void> {
  if (input.typeEvent !== 'consultation') return
  const cible = COMPTEURS_DENORMALISES[input.typeEntite]
  if (!cible) return

  try {
    const data = { vues: { increment: 1 } }
    if (cible === 'opportunite') {
      await prisma.opportunite.update({ where: { id: input.entiteId }, data })
    } else {
      await prisma.ressource.update({ where: { id: input.entiteId }, data })
    }
  } catch (err) {
    logger.warn('[consultations] incrément du cache `vues` échoué', {
      typeEntite: input.typeEntite,
      error:      err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Marque les recommandations correspondantes comme vues.
 * Répare le KPI `recosVues` de `src/lib/ia/metrics/outcomes.ts`, qui lisait
 * `vuePar` sans que rien ne l'écrive en production.
 */
async function marquerRecoVue(input: ConsultationInput): Promise<void> {
  if (input.origine !== 'reco_ia' || !input.cjsUid || input.typeEntite !== 'opportunite') return

  try {
    await prisma.recommandationIA.updateMany({
      where: { cjsUid: input.cjsUid, opportuniteId: input.entiteId, vuePar: null },
      data:  { vuePar: new Date() },
    })
  } catch (err) {
    logger.warn('[consultations] marquage `vuePar` échoué', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Enregistre une vue. Ne throw jamais.
 *
 *   await trackConsultation({
 *     typeEntite: 'opportunite',
 *     entiteId:   opp.id,
 *     typeEvent:  'consultation',
 *     canal:      canalFromSrc(searchParams.src),
 *     cjsUid:     session?.cjsUid,
 *     ip,
 *   })
 */
export async function trackConsultation(input: ConsultationInput): Promise<void> {
  try {
    const parsed = ConsultationInputSchema.parse(input)

    // Sujet : l'utilisateur connecté d'abord ; sinon l'empreinte IP + user-agent,
    // qui évite que tous les anonymes se confondent en un seul sujet. Constante
    // en dernier recours (rendu serveur sans requête identifiable).
    const empreinte = [parsed.ip, parsed.userAgent].filter(Boolean).join('|')
    const sujet = parsed.cjsUid ?? (empreinte || 'anonyme')
    const sujetHash = hashSujet(sujet)

    const premiereVue = await redis.set(cleDedup(parsed, sujetHash), '1', 'EX', CONSULTATION_DEDUP_TTL_SECONDS, 'NX')
    if (!premiereVue) return

    await prisma.consultation.create({
      data: {
        typeEntite: parsed.typeEntite,
        entiteId:   parsed.entiteId,
        typeEvent:  parsed.typeEvent,
        canal:      parsed.canal,
        cjsUid:     parsed.cjsUid ?? null,
        sujetHash,
        origine:    parsed.origine ?? null,
        sessionId:  parsed.sessionId ?? null,
      },
    })

    await incrementerCache(parsed)
    await marquerRecoVue(parsed)
  } catch (err) {
    // Fail-soft — le tracking ne bloque jamais l'expérience utilisateur.
    logger.warn('[consultations] enregistrement échoué — fail-soft', {
      typeEntite: input?.typeEntite,
      canal:      input?.canal,
      error:      err instanceof Error ? err.message : String(err),
    })
  }
}

/** Champs communs à un lot d'impressions (un bloc de cards Yaye, une liste WhatsApp). */
export interface ImpressionsCommon {
  typeEntite: EntiteConsultableValue
  canal:      CanalConsultationValue
  cjsUid?:    string
  sessionId?: string
  origine?:   OrigineConsultationValue
}

/**
 * Émet une impression par identifiant. Utilisé quand Yaye renvoie un bloc :
 * afficher 5 cards, c'est 5 impressions — les clics, eux, sont comptés côté web
 * via `?src=`.
 */
export async function trackImpressions(entiteIds: string[], common: ImpressionsCommon): Promise<void> {
  if (entiteIds.length === 0) return

  await Promise.all(
    entiteIds.map((entiteId) =>
      trackConsultation({ ...common, entiteId, typeEvent: 'impression' }),
    ),
  )
}
