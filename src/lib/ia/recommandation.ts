// Sprint 4 — M12 : Recommandation intelligente d'opportunités
// À implémenter une fois le modèle de données confirmé
// Voir docs/metier.md — section "Agent Yaye"

export interface RecommandationResult {
  opportuniteId: string
  score: number
  raison: string
}

export async function getRecommandations(_cjsUid: string): Promise<RecommandationResult[]> {
  // TODO : implémenter avec Groq (llama-3.3-70b-versatile)
  // après confirmation du modèle de données
  return []
}
