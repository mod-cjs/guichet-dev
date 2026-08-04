/**
 * GUIC-689 — Ligne de sources de Yaye (règle non négociable du design v5 :
 * « Aucune réponse de l'assistante Yaye sans ligne de sources »).
 *
 * Le libellé est DÉRIVÉ de ce qui a réellement servi à composer la réponse,
 * jamais posé en dur : `buildContextBlock` (agent.ts) renvoie une chaîne vide
 * quand ni mémo ni contexte graphe ne sont disponibles (nouvel inscrit, graphe
 * pas encore construit, échec de chargement), et une réponse peut être rédigée
 * sans qu'aucun outil catalogue n'ait été appelé.
 *
 * Affirmer « basé sur ton profil » dans ces cas fabriquerait une caution :
 * on préfère alors ne pas afficher de ligne du tout (retour `null`).
 */
export interface SourcesInput {
  /** Contexte graphe injecté dans le message (profil × catalogue), '' si absent. */
  graphContext?: string | null
  /** Mémo de session (préférences retenues), null si absent. */
  memo?: string | null
  /** Outils réellement appelés pendant le tour. */
  toolsUsed: string[]
}

export function buildSourcesLabel({ graphContext, memo, toolsUsed }: SourcesInput): string | null {
  const aContextePersonnel = Boolean(graphContext?.trim() || memo?.trim())
  const aConsulteCatalogue = toolsUsed.length > 0

  const parts: string[] = []
  if (aContextePersonnel) parts.push('ton profil')
  if (aConsulteCatalogue) parts.push('le catalogue du Guichet')
  if (parts.length === 0) return null

  return `Basé sur ${parts.join(' et ')}`
}
