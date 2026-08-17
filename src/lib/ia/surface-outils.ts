// GUIC-706 — la surface offerte au modèle, calculée en un seul endroit.
//
// NON IMPLÉMENTÉ — surface seule, pour que les tests échouent sur la conduite et non sur
// des symboles absents. Le comportement vient au commit suivant.

import { TOOLS, TOOL_DEFINITIONS, type ToolDefinition } from './tools'
import { SYSTEM_PROMPT } from './agent'

export interface SurfaceOutils {
  /** Prompt réduit aux outils réellement disponibles. */
  promptSysteme: string
  /** Définitions envoyées au modèle. */
  definitions: ToolDefinition[]
  /** Clés du registre — l'agent parse aussi les appels émis en texte brut. */
  nomsOutils: string[]
}

export async function surfaceDisponible(
  _roles: readonly string[] | null | undefined,
): Promise<SurfaceOutils> {
  return {
    promptSysteme: SYSTEM_PROMPT,
    definitions: [...TOOL_DEFINITIONS],
    nomsOutils: Object.keys(TOOLS),
  }
}
