/**
 * Impressions des cards Yaye — GUIC-688.
 * Spec : `.agent_context/specs/GUIC-688-consultations-multicanal.md`.
 *
 * Quand l'agent surface un bloc de cards, le contenu a été VU sans avoir été
 * ouvert. On enregistre donc des `impression`, jamais des `consultation` : les
 * clics, eux, sont comptés côté web quand le lien `?src=ia` est suivi. Mélanger
 * les deux rendrait tout taux de conversion faux.
 */

import type { CanalAgent } from '@prisma/client'
import { trackImpressions, type CanalConsultationValue, type EntiteConsultableValue } from '@/lib/analytics/consultations'
import type { YayeBlock } from './blocks'

/** Outils dont les cards proviennent d'une recommandation personnalisée. */
const OUTILS_RECO = new Set(['get_recommendations', 'recommandations', 'reco_opportunites'])

/**
 * Traduit le type de bloc en entité traçable.
 * `null` pour tout ce qui ne présente pas un contenu du catalogue (texte,
 * quick replies, notifications, carte CJS…) : rien à tracer.
 */
export function entiteDepuisBlock(kind: YayeBlock['kind']): EntiteConsultableValue | null {
  switch (kind) {
    case 'opportunites': return 'opportunite'
    case 'evenements':   return 'evenement'
    case 'ressources':   return 'ressource'
    case 'centres':      return 'centre'
    default:             return null
  }
}

/**
 * `CanalAgent` ne connaît que web|whatsapp ; côté consultations on distingue le
 * web classique du chat IA rendu dans le web, d'où la traduction.
 */
export function canalDepuisAgent(canal: CanalAgent): CanalConsultationValue {
  return canal === 'whatsapp' ? 'whatsapp' : 'ia_web'
}

/**
 * Les livres n'ont pas de bloc dédié : l'outil bibliothèque les surface dans un
 * bloc `action` dont les boutons pointent vers `/jeune/bibliotheque/<id>`. On
 * récupère les identifiants là plutôt que d'inventer un type de bloc — la sortie
 * de Yaye et son rendu restent inchangés.
 */
const LIEN_LIVRE = /\/jeune\/bibliotheque\/([^/?#]+)/

function livresDepuisBoutons(block: YayeBlock): string[] {
  if (block.kind !== 'action') return []
  const boutons = block.buttons ?? []
  return boutons
    .map((b) => b.href?.match(LIEN_LIVRE)?.[1])
    .filter((id): id is string => Boolean(id))
}

export interface BlockImpressionContext {
  canal:      CanalAgent
  cjsUid:     string
  sessionId:  string
  /** Nom de l'outil ayant produit le bloc — sert à distinguer une reco d'une recherche. */
  outil?:     string
}

/**
 * Émet une impression par card du bloc. Ne throw jamais : une erreur de
 * tracking ne doit pas empêcher Yaye de répondre.
 */
export async function trackBlockImpressions(block: YayeBlock, ctx: BlockImpressionContext): Promise<void> {
  try {
    const livres = livresDepuisBoutons(block)
    const typeEntite = livres.length > 0 ? 'livre' : entiteDepuisBlock(block.kind)
    if (!typeEntite) return

    const items = (block as { items?: { id?: string }[] }).items ?? []
    const ids = livres.length > 0
      ? livres
      : items.map((i) => i.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (ids.length === 0) return

    await trackImpressions(ids, {
      typeEntite,
      canal:     canalDepuisAgent(ctx.canal),
      cjsUid:    ctx.cjsUid,
      sessionId: ctx.sessionId,
      origine:   ctx.outil && OUTILS_RECO.has(ctx.outil) ? 'reco_ia' : 'ia',
    })
  } catch {
    // Fail-soft — la réponse de l'agent prime sur sa mesure.
  }
}

/** Identifiants portés par un bloc — enrichit `AgentLog.nodesReturned`. */
export function idsDepuisBlock(block?: YayeBlock): string[] {
  if (!block || !entiteDepuisBlock(block.kind)) return []
  const items = (block as { items?: { id?: string }[] }).items ?? []
  return items.map((i) => i.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
}
