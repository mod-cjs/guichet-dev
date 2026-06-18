// Contrat de réponse "en blocs" de Yaye (partagé backend ↔ frontend).
// Le service agent renvoie une réponse NORMALISÉE (sans canal) ; le rendu
// (cards cliquables, boutons de soumission) est fait par le frontend / le
// formateur. Cf. .agent_context/specs/yaye/04-canaux-web-whatsapp.md (formateur)
// et 03-outils-function-calling.md (objets normalisés resultats_livres, etc.).

/** Opportunité prête à afficher en card cliquable (→ /opportunites/[slug]). */
export interface YayeOppItem {
  id: string
  slug: string
  titre: string
  type: string // TypeOpportunite (libellé enum)
  organisation: string | null
  region: string | null
  deadline: string | null // ISO 8601
}

/** Un bloc de réponse — rendu différemment selon son `kind`. */
export type YayeBlock =
  | { kind: 'text'; text: string }
  | { kind: 'opportunites'; items: YayeOppItem[] }
  | {
      kind: 'action'
      title?: string
      subtitle?: string
      actions: { icon: string; label: string }[]
      buttons?: { label: string; href?: string; primary?: boolean }[]
    }
