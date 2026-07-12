// Garde-fou de la RÉPONSE finale de Yaye : neutralise les réponses « méta » des petits modèles
// — celles qui DÉCRIVENT la mécanique (« la fonction … a été appelée », « voici un exemple de
// message », JSON/args d'outil) ou parlent du jeune à la 3ᵉ personne (« le bénéficiaire ») au
// lieu de LUI parler. Défaut terrain n°1 mesuré par l'éval (check `addresses-user`).
//
// Le MÊME détecteur sert à l'agent (réparation) et à l'éval (`checks.ts` le réexporte) : ce que
// la prod répare est exactement ce que l'éval mesure.

import type { YayeBlock } from './blocks'

/** Marqueurs d'une réponse qui n'est pas adressée à l'utilisateur (fuite de mécanique/raisonnement). */
export const META_MARKERS = [
  'la fonction',
  'cette fonction',
  'appeler la fonction',
  "l'outil",
  'la réponse est',
  'cette réponse',
  'voici une réponse',
  'voici un exemple',
  'un exemple de message',
  'un exemple de réponse',
  'le message affiché',
  'le message à afficher',
  'réponse possible',
  'il faudrait',
  'on pourrait dire',
  'je pourrais dire',
  'paramètre',
  'les arguments suivants',
  'argument ',
  'opportuniteid',
  'ressourceid',
  'scope=',
  'json',
  ' api ',
  "l'api",
  'search_opportunities',
  'get_realtime_data',
  'get_recommendations',
  'query_knowledge_graph',
  'get_user_profile',
  'get_badge',
  'reserve_resource',
  'submit_application',
  'escalate_to_advisor',
]

/** Tournures qui parlent DE l'utilisateur (3ᵉ pers.) au lieu de LUI parler (2ᵉ pers.). */
export const THIRD_PERSON_USER = ['le bénéficiaire', 'la bénéficiaire', "l'utilisateur", "l'utilisatrice", 'la personne qui', 'le jeune ', 'du bénéficiaire', 'la personne a ']

export interface MetaCheck {
  flagged: boolean
  hits: string[]
}

/** Détecte une réponse « méta » (non adressée à l'utilisateur). */
export function detectMetaLeakage(reply: string): MetaCheck {
  const t = ' ' + reply.toLowerCase().replace(/\s+/g, ' ') + ' '
  const hits: string[] = []
  for (const m of META_MARKERS) if (t.includes(m)) hits.push(m.trim())
  for (const m of THIRD_PERSON_USER) if (t.includes(m)) hits.push(m.trim())
  return { flagged: hits.length > 0, hits }
}

/**
 * Répare une réponse méta en s'appuyant sur les BLOCS déjà produits (le détail utile y vit déjà) :
 * escalade → accusé chaleureux ; cards/action → courte intro qui renvoie aux cartes ; sinon reprise
 * honnête et brève. No-op si la réponse est déjà adressée à l'utilisateur. Même philosophie que
 * `trimTextWhenCards` : quand les blocs portent le fond, le texte reste une amorce courte.
 */
export function repairMetaReply(reply: string, blocks: YayeBlock[]): string {
  if (!detectMetaLeakage(reply).flagged) return reply
  const esc = blocks.find((b) => b.kind === 'escalade') as { danger?: boolean } | undefined
  if (esc) {
    return esc.danger
      ? "Merci de m'en avoir parlé, tu as bien fait. Je transmets tout de suite à une personne de confiance du CJS qui va te recontacter — tu n'es pas seul·e."
      : 'Je transmets ta demande à un conseiller du CJS, il va te recontacter. Tu peux la rappeler avec la référence si besoin.'
  }
  if (blocks.some((b) => b.kind === 'opportunites')) {
    return 'J’ai regardé pour toi — le détail est sur les cartes juste en dessous 👇'
  }
  if (blocks.some((b) => b.kind === 'action')) {
    return 'C’est prêt de mon côté — regarde juste en dessous.'
  }
  return 'Je veux bien t’aider — dis-moi en une phrase ce que tu cherches (une offre, une formation, une démarche) et je m’en occupe.'
}
