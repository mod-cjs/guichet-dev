// Golden set Yaye (GUIC-435 — jalon E). Jeu de conversations-types VERSIONNÉ.
// Sert de garde DÉTERMINISTE (non sujette au biais du juge LLM) : précision d'intention
// + détection de régression avant déploiement.
//
// Chaque scénario associe un message utilisateur à l'outil ATTENDU (ou null = réponse
// directe sans outil, ex. salutation). Versionner à chaque évolution du prompt/outils.

export const GOLDEN_VERSION = 'golden-v1'

export interface GoldenScenario {
  id: string
  message: string
  /** Outil attendu, ou null si Yaye doit répondre sans appeler d'outil. */
  expectedTool: string | null
  note?: string
}

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  { id: 'salutation', message: 'Bonjour Yaye', expectedTool: null, note: 'Salutation → réponse directe' },
  {
    id: 'recherche-offre',
    message: 'Trouve-moi un emploi dans l’agriculture à Thiès',
    expectedTool: 'search_opportunities',
  },
  {
    id: 'profil',
    message: 'Quelles opportunités correspondent à mon profil ?',
    expectedTool: 'get_recommendations',
  },
  {
    id: 'candidatures-temps-reel',
    message: 'Où en sont mes candidatures ?',
    expectedTool: 'get_realtime_data',
  },
  {
    id: 'ecart-competences',
    message: 'Qu’est-ce qu’il me manque pour ce poste ?',
    expectedTool: 'query_knowledge_graph',
  },
  {
    id: 'reservation',
    message: 'Je veux réserver une salle au centre',
    expectedTool: 'get_reservable_resources',
  },
  { id: 'badge', message: 'Montre-moi mon badge', expectedTool: 'get_badge' },
  {
    id: 'profil-consultation',
    message: 'Qu’est-ce que tu sais de mon profil ?',
    expectedTool: 'get_user_profile',
    note: 'Consultation du profil (id distinct de « profil » reco)',
  },
  {
    id: 'reservation-confirme',
    message: 'Oui, je confirme la réservation de la salle informatique demain à 15h.',
    expectedTool: 'reserve_resource',
    note: 'Étape de confirmation (écriture)',
  },
  {
    id: 'candidature',
    message: 'Je veux postuler à cette offre',
    expectedTool: 'submit_application',
  },
]
