// GUIC-706 — retirer du modèle les intentions d'un module masqué.
//
// `query_knowledge_graph` n'est pas un outil de contexte mais un second moteur de
// récupération : chaque intention rend les données d'un module. La garde d'exécution vit
// dans `flags/yaye.ts` ; ici on retire l'intention de ce que le MODÈLE voit, sans quoi il
// continuerait de la tenter — en annonçant au passage la fonctionnalité qu'on cache.
//
// LIMITE CONNUE, la même qu'au niveau 2 : on retire les IDENTIFIANTS d'intention, pas la
// prose. La phrase d'ouverture de la description parle des « opportunités » quel que soit
// l'état du catalogue. Rien ne permet au modèle de DÉCOUVRIR une intention retirée ; il
// peut seulement lire une phrase de cadrage un peu large.

import type { ToolDefinition } from './tools'

/** Énumération des intentions, sous la clé où la définition la range. */
type Props = Record<string, { enum?: string[]; description?: string }>

/**
 * Description d'un paramètre quand seules `restantes` demeurent.
 *
 * Chaque variante est construite pour REPRODUIRE la description d'origine lorsque toutes
 * les intentions du paramètre sont ouvertes — l'ordre des mentions y est donc significatif.
 */
type Variante = (restantes: ReadonlySet<string>) => string

/** `Filtre secteur (recherche/parcours)` → la liste suit ce qui reste. */
const filtre =
  (base: string, ordre: readonly string[]): Variante =>
  (restantes) =>
    `${base} (${ordre.filter((i) => restantes.has(i)).join('/')})`

/**
 * Paramètre de `query_knowledge_graph` → intentions qu'il sert.
 *
 * Un paramètre dont TOUTES les intentions sont masquées est retiré : laisser `theme`
 * décrirait en creux la recherche de livres qu'on vient de fermer.
 */
export const INTENTIONS_PARAM: Record<string, readonly string[]> = {
  opportuniteId: ['ecart_competences', 'ressources_competences'],
  domaine: ['recherche', 'parcours'],
  region: ['recherche', 'parcours'],
  type: ['recherche'],
  q: ['recherche', 'livre_disponible'],
  theme: ['livre_disponible'],
  programme: ['acteurs_programme'],
}

/** Paramètres dont la description NOMME une intention : elle doit suivre le filtrage. */
const VARIANTE_PARAM: Record<string, Variante> = {
  opportuniteId: (restantes) => {
    const [premiere] = INTENTIONS_PARAM.opportuniteId.filter((i) => restantes.has(i))
    return `Requis pour \`${premiere}\` : l'offre visée`
  },
  domaine: filtre('Filtre secteur', ['recherche', 'parcours']),
  region: filtre('Filtre région', ['recherche', 'parcours']),
  type: filtre('Filtre type', ['recherche']),
  q: (restantes) => {
    const parts = [
      restantes.has('recherche') ? 'titre (recherche)' : null,
      restantes.has('livre_disponible') ? 'titre/auteur (livre_disponible)' : null,
    ].filter(Boolean)
    return `Mots-clés : ${parts.join(' ou ')}`
  },
}

/**
 * Définition réduite aux intentions encore ouvertes, ou `null` s'il n'en reste aucune.
 *
 * Ne mute JAMAIS la définition reçue : le registre est un module partagé, une définition
 * amputée en place contaminerait toutes les conversations suivantes — y compris celles d'un
 * administrateur, qui doit voir la plateforme entière.
 */
export function filtrerDefinitionGraphe(
  definition: ToolDefinition,
  masquees: ReadonlySet<string>,
): ToolDefinition | null {
  const parametres = definition.function.parameters as {
    properties?: Props
    [k: string]: unknown
  }
  const props = parametres.properties ?? {}
  const toutes = props.intent?.enum ?? []
  const restantes = toutes.filter((i) => !masquees.has(i))

  // Rien retiré : on rend l'objet d'origine, garantissant l'identité à l'octet dans le cas
  // nominal — l'immense majorité du temps.
  if (restantes.length === toutes.length) return definition
  if (restantes.length === 0) return null

  const ouvertes = new Set(restantes)
  const nouvelles: Props = { intent: { ...props.intent, enum: restantes } }

  for (const [nom, def] of Object.entries(props)) {
    if (nom === 'intent') continue
    const servies = INTENTIONS_PARAM[nom]
    // Paramètre hors table : on le garde plutôt que de le perdre en silence. Un test
    // vérifie que la table couvre toute la définition, ce cas ne devrait pas survenir.
    if (!servies) {
      nouvelles[nom] = def
      continue
    }
    if (!servies.some((i) => ouvertes.has(i))) continue
    const variante = VARIANTE_PARAM[nom]
    nouvelles[nom] = variante ? { ...def, description: variante(ouvertes) } : def
  }

  return {
    ...definition,
    function: {
      ...definition.function,
      description: sansPuces(definition.function.description, masquees),
      parameters: { ...parametres, properties: nouvelles },
    },
  }
}

/** Retire les puces `- \`intention\` : …` des intentions masquées. */
function sansPuces(description: string, masquees: ReadonlySet<string>): string {
  return description
    .split('\n')
    .filter((ligne) => {
      const m = ligne.match(/^-\s+`([a-z_]+)`/)
      return !m || !masquees.has(m[1])
    })
    .join('\n')
}
