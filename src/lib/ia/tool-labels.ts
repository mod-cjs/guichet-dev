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
