// GUIC-706 — la surface offerte au modèle, calculée en un seul endroit.
//
// `runAgent` et sa variante streaming réduisaient chacune registre, définitions et prompt.
// Le graphe se gardant par intention, la réduction cesse d'être un `filter` d'une ligne :
// la calculer une fois évite que les deux chemins divergent — et c'est le chemin streaming
// qui sert les conversations réelles.

import { OUTIL_GRAPHE, intentionsMasquees, outilsMasques } from '@/lib/flags/yaye'
import { TOOLS, TOOL_DEFINITIONS, type ToolDefinition } from './tools'
import { construireSystemPrompt } from './prompt-outils'
import { filtrerDefinitionGraphe } from './graphe-definition'

export interface SurfaceOutils {
  /** Prompt réduit aux outils réellement disponibles. */
  promptSysteme: string
  /** Définitions envoyées au modèle. */
  definitions: ToolDefinition[]
  /** Clés du registre — l'agent parse aussi les appels émis en texte brut. */
  nomsOutils: string[]
}

export async function surfaceDisponible(
  roles: readonly string[] | null | undefined,
): Promise<SurfaceOutils> {
  const masques = await outilsMasques(roles)
  const intentions = await intentionsMasquees(roles)

  // `retires` part des outils masqués et peut gagner le graphe en chemin, si plus aucune de
  // ses intentions ne reste. Il sert AUSSI à réduire le prompt : un outil retiré des
  // définitions mais nommé dans le prompt serait annoncé puis refusé.
  const retires = new Set(masques)
  const definitions: ToolDefinition[] = []

  for (const def of TOOL_DEFINITIONS) {
    const nom = def.function.name
    if (retires.has(nom)) continue

    if (nom === OUTIL_GRAPHE) {
      const filtree = filtrerDefinitionGraphe(def, intentions)
      if (!filtree) {
        retires.add(nom)
        continue
      }
      definitions.push(filtree)
      continue
    }

    definitions.push(def)
  }

  return {
    promptSysteme: construireSystemPrompt(retires, intentions),
    definitions,
    nomsOutils: Object.keys(TOOLS).filter((n) => !retires.has(n)),
  }
}
