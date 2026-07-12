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

// Salutation en TÊTE de réponse : à réserver au 1er message. En milieu de conversation, resaluer
// (« Salut ! », « Bonjour ! », « Ravie de te voir ») à chaque tour est robotique → on la retire.
const RE_LEADING_GREETING =
  /^\s*(re[-\s]?)?(bonjour|bonsoir|salut|coucou|hello|hey|hi|yo|wesh|salam|asalamu?\s*aleykoum|nanga\s*def)\b(\s+[a-zà-ÿ'’-]+)?[\s!,.…—–-]*/i
const RE_LEADING_WARMOPEN =
  /^\s*(ravie?|contente?|heureuse?|ravi)\s+de\s+te\s+(voir|revoir|retrouver|avoir|parler|lire)\b[\s!,.…—–-]*/i

/** Retire une salutation d'ouverture (hors 1er message) et remajuscule. '' si la réponse n'était QUE ça. */
export function stripLeadingGreeting(reply: string): string {
  let r = reply
  for (let i = 0; i < 3; i++) {
    const before = r
    r = r.replace(RE_LEADING_GREETING, '').replace(RE_LEADING_WARMOPEN, '')
    if (r === before) break
  }
  r = r.trimStart()
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : ''
}

/**
 * Post-traitement final de la réponse : anti-méta PUIS, en milieu de conversation, retrait de la
 * salutation d'ouverture. Si le retrait vide le texte alors que des cards portent le fond, on met
 * une amorce neutre ; sinon on garde la réponse d'origine (réponse purement sociale au 1er tour).
 */
export function finalizeReply(reply: string, blocks: YayeBlock[], firstTurn: boolean): string {
  const r = repairMetaReply(reply, blocks)
  if (firstTurn) return r
  const stripped = stripLeadingGreeting(r)
  if (stripped) return stripped
  return blocks.some((b) => b.kind === 'opportunites' || b.kind === 'action') ? 'Voici ce que j’ai trouvé pour toi.' : r
}
