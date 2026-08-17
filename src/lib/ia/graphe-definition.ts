// GUIC-706 — retirer du modèle les intentions d'un module masqué.
//
// NON IMPLÉMENTÉ — surface seule, pour que les tests échouent sur la conduite et non sur
// des symboles absents. Le comportement vient au commit suivant.

import type { ToolDefinition } from './tools'

/** Paramètre de `query_knowledge_graph` → intentions qu'il sert. */
export const INTENTIONS_PARAM: Record<string, readonly string[]> = {}

/**
 * Définition réduite aux intentions encore ouvertes, ou `null` s'il n'en reste aucune.
 */
export function filtrerDefinitionGraphe(
  definition: ToolDefinition,
  _masquees: ReadonlySet<string>,
): ToolDefinition | null {
  return definition
}
