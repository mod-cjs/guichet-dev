// Libellés d'attente contextuels par outil (#thinking-state).
// L'agent émet un événement `tool` au démarrage de chaque outil (SSE) ; le client
// affiche CE que Yaye fait vraiment au lieu d'un « … » muet. `searching` = l'outil
// produit des cards d'opportunités → on peut afficher des skeleton cards.

export interface ToolStatus {
  label: string
  /** Outil qui ramène des offres → autorise l'affichage de skeleton cards. */
  searching?: boolean
}

const MAP: Record<string, ToolStatus> = {
  get_user_profile: { label: 'Yaye consulte ton profil' },
  get_realtime_data: { label: 'Yaye vérifie tes infos' },
  search_opportunities: { label: 'Yaye cherche des opportunités', searching: true },
  query_knowledge_graph: { label: 'Yaye interroge ses connaissances', searching: true },
  get_recommendations: { label: 'Yaye prépare des recommandations', searching: true },
  get_reservable_resources: { label: 'Yaye regarde les salles disponibles' },
  reserve_resource: { label: 'Yaye prépare ta réservation' },
  get_badge: { label: 'Yaye récupère ton badge' },
  search_library: { label: 'Yaye cherche dans la bibliothèque', searching: true },
  borrow_book: { label: "Yaye prépare ton emprunt" },
  get_active_loans: { label: 'Yaye regarde tes emprunts' },
  submit_application: { label: 'Yaye prépare ta candidature' },
  escalate_to_advisor: { label: 'Yaye contacte un conseiller' },
}

/** Statut d'attente pour un outil (fallback générique si inconnu). */
export function toolStatus(name: string): ToolStatus {
  return MAP[name] ?? { label: 'Yaye réfléchit' }
}

// Libellé métier court d'une intention (= 1er outil de la session), pour le
// back-office admin. Distinct des libellés d'attente ci-dessus (verbes → noms).
const INTENT_MAP: Record<string, string> = {
  get_user_profile: 'Consultation du profil',
  get_realtime_data: 'Suivi (candidatures / favoris)',
  search_opportunities: "Recherche d'opportunités",
  query_knowledge_graph: 'Conseil / raisonnement',
  get_recommendations: 'Recommandations',
  get_reservable_resources: 'Réservation (recherche)',
  reserve_resource: 'Réservation',
  get_badge: 'Badge / carte CJS',
  search_library: 'Bibliothèque (recherche)',
  borrow_book: 'Emprunt de livre',
  get_active_loans: 'Emprunts en cours',
  submit_application: 'Candidature',
  escalate_to_advisor: 'Escalade conseiller',
}

/** Libellé métier d'une intention (nom d'outil). « Conversation » si aucun outil. */
export function intentLabel(name: string | null | undefined): string {
  if (!name) return 'Conversation'
  return INTENT_MAP[name] ?? name
}
