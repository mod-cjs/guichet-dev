// Port d'abstraction du Knowledge Graph (GUIC-259, GUIC-275, Lot 1, R1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Le service agent ne dépend JAMAIS en dur de Neo4j : il passe par ce port.
// Deux implémentations :
//   - Neo4jGraphAdapter  (cible)    → traversées Cypher sur le read-model.
//   - PrismaGraphAdapter (fallback) → recherche/matching simple via Prisma.
//
// La surface réactive riche (NL → Cypher whitelisté : écart de compétences,
// reco collaborative, parcours multi-entités) arrivera avec query_knowledge_graph
// (GUIC-433). Ce port démarre par le strict nécessaire pour valider l'abstraction
// + le health check, de façon honnêtement extensible.

export type GraphBackend = 'neo4j' | 'prisma'

export interface GraphHealth {
  ok: boolean
  backend: GraphBackend
  detail?: string
}

/** Critères de recherche d'opportunités (sous-ensemble — surface complète en GUIC-433). */
export interface OpportuniteSearchCriteria {
  /** Valeur d'enum `Domaine` (validée par l'adapter). */
  domaine?: string
  /** Valeur d'enum `Region`. */
  region?: string
  /** Valeur d'enum `TypeOpportunite`. */
  type?: string
  /** Mots-clés cherchés dans le titre. */
  q?: string
  /** Borne de résultats (défaut 5, max 20). */
  limit?: number
}

/** Projection minimale d'une opportunité — alignée sur `YayeOppItem` du Lot 0. */
export interface GraphOpportunite {
  id: string
  slug: string
  titre: string
  type: string
  organisation: string | null
  region: string | null
  /** ISO 8601 ou null. */
  deadline: string | null
}

/** Référence compacte d'une compétence. */
export interface CompetenceRef {
  slug: string | null
  libelle: string
}

/** Résultat d'une analyse d'écart de compétences (orientation active, spec §4.2). */
export interface SkillGapResult {
  /** Compétences requises par l'offre que le bénéficiaire ne maîtrise pas. */
  manquantes: CompetenceRef[]
  /** Formations publiées qui développent ces compétences manquantes. */
  formations: GraphOpportunite[]
}

/** Une reco collaborative AGRÉGÉE (jamais d'attribut d'un autre bénéficiaire). */
export interface RecoAggregate {
  id: string
  slug: string
  titre: string
  popularite: number
}

/** Un maillon de parcours multi-entités (opportunité → formation → programme). */
export interface MultiEntityPath {
  id: string
  slug: string
  titre: string
  competence: string | null
  formationTitre: string | null
  programmeNom: string | null
}

/** Critères de recherche d'un livre disponible en bibliothèque de centre. */
export interface LivreSearchCriteria {
  /** Mots-clés (titre ou auteur). */
  q?: string
  /** Thème du catalogue. */
  theme?: string
  /** Valeur d'enum `Region` — restreint aux centres de cette région. */
  region?: string
  /** Borne de résultats (défaut 5, max 20). */
  limit?: number
}

/**
 * Un exemplaire DISPONIBLE avec son emplacement physique précis.
 * C'est l'exemple canonique de la note (§5.3) : « un livre sur l'agriculture
 * disponible à Thiès » → Livre → Exemplaire → Centre → Region.
 */
export interface GraphLivreDispo {
  livreId: string
  titre: string
  auteur: string
  theme: string
  exemplaireId: string
  centreId: string
  centreNom: string
  region: string | null
  rayon: string
  etagere: string
  position: string
}

/** Ressource pédagogique qui PRÉPARE une ou plusieurs compétences visées. */
export interface GraphRessourcePrepa {
  id: string
  titre: string
  type: string
  theme: string
  niveau: string | null
  /** Libellés des compétences préparées, parmi celles demandées. */
  competences: string[]
}

/** Un décompte agrégé (clé → nombre d'offres). */
export interface MarketCount {
  cle: string
  n: number
}

/**
 * Photographie AGRÉGÉE du marché des opportunités ouvertes (recherche globale).
 * ⚠️ Ne contient QUE des décomptes d'offres — jamais de personnes, de candidatures
 * ni d'attributs de bénéficiaires (invariant CDP, doc 07).
 */
export interface MarketOverview {
  /** Nombre total d'offres ouvertes sur le périmètre demandé. */
  total: number
  parType: MarketCount[]
  parDomaine: MarketCount[]
  parRegion: MarketCount[]
  /** Compétences les plus demandées par ces offres. */
  competences: MarketCount[]
  /** Organisations qui publient le plus sur ce périmètre. */
  organisations: MarketCount[]
  /** GUIC-684 — répartition par programme sectoriel (une offre cofinancée compte
   *  pour chacun de ses programmes). */
  programmes: MarketCount[]
}

/** Périmètre d'un aperçu de marché (facultatif : tout le Sénégal si vide). */
export interface MarketCriteria {
  region?: string
  domaine?: string
  /** Nombre d'entrées par palmarès (défaut 5, max 20). */
  limit?: number
}

/**
 * Le read-model est VIDE (fenêtre de reconstruction du cron nocturne, base non
 * projetée…). Distinct d'un « aucun résultat » métier : le port résilient doit
 * BASCULER sur le fallback plutôt que de répondre « rien trouvé ».
 */
export class GraphEmptyError extends Error {
  constructor(detail = 'read-model vide') {
    super(`[graph] ${detail}`)
    this.name = 'GraphEmptyError'
  }
}

/** Portée d'appel d'un bénéficiaire (RBAC : un appel ne voit que ses données). */
export interface GraphUserScope {
  cjsUid: string
  roles?: string[]
  /**
   * Centre de rattachement de l'appelant staff (gestionnaire/conseiller). `null` pour
   * un bénéficiaire (périmètre national). Disponible dans les templates pour borner
   * les traversées au centre — activé avec la surface gestionnaire (Lot 7).
   */
  centreId?: string | null
}

/**
 * Port du graphe. Toute opération est en LECTURE (Neo4j = read-model).
 * Les écritures passent par le pipeline de projection Prisma→Neo4j (GUIC-279).
 *
 * Réactif (`query_knowledge_graph`) et proactif (`get_recommendations`) partagent
 * cette même logique de traversée (spec §0 — un seul cerveau : le graphe).
 */
export interface GraphPort {
  readonly backend: GraphBackend
  /** Vérifie la connectivité du backend. Ne lève jamais. */
  healthcheck(): Promise<GraphHealth>
  /** Recherche simple d'opportunités publiées et non expirées. */
  searchOpportunites(criteria: OpportuniteSearchCriteria): Promise<GraphOpportunite[]>
  /** Écart de compétences entre un bénéficiaire et une opportunité + formations qui le comblent. */
  skillGap(scope: GraphUserScope, opportuniteId: string): Promise<SkillGapResult>
  /** Opportunités éligibles au profil (niveau d'étude + expérience), non déjà postulées. */
  eligibleOpportunites(scope: GraphUserScope, limit?: number): Promise<GraphOpportunite[]>
  /** Reco collaborative agrégée (« des profils comme toi ont aussi postulé à… »). */
  collaborativeReco(scope: GraphUserScope, limit?: number): Promise<RecoAggregate[]>
  /** Parcours multi-entités pour la découverte (opportunité → compétence → formation → programme). */
  multiEntityPath(criteria: { domaine?: string; region?: string; limit?: number }): Promise<MultiEntityPath[]>
  /** Exemplaires disponibles + emplacement physique (Livre → Exemplaire → Centre → Region). */
  livresDisponibles(criteria: LivreSearchCriteria): Promise<GraphLivreDispo[]>
  /** Ressources pédagogiques préparant les compétences visées (RessourcePedagogique -PREPARE-> Competence). */
  ressourcesPourCompetences(slugs: string[], limit?: number): Promise<GraphRessourcePrepa[]>
  /** Recherche GLOBALE : photographie agrégée du marché des offres ouvertes (jamais de personnes). */
  apercuMarche(criteria: MarketCriteria): Promise<MarketOverview>
}

export const DEFAULT_LIMIT = 5
export const MAX_LIMIT = 20

/** Borne la limite demandée dans [1, MAX_LIMIT]. */
export function clampLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}
