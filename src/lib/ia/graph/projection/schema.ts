// Schéma du Knowledge Graph : labels, clés naturelles, contraintes, index (GUIC-276/277).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §3 (21 nœuds + 10 sous-types)
//
// Source unique des labels/clés → réutilisée par les contraintes ET les projecteurs.

import { ensureConstraints, ensureIndexes } from './cypher'

/** Les 10 labels de sous-type d'opportunité (décompression CTI — spec §2). */
export const OPPORTUNITE_SUBTYPE_LABELS = [
  'Emploi', 'Stage', 'Formation', 'Bourse', 'Concours',
  'AppelAProjets', 'Financement', 'Mentorat', 'Mobilite', 'Volontariat',
] as const

/**
 * Clé naturelle (unique) par label. Tout nœud porte une contrainte d'unicité.
 * Les sous-types d'opportunité partagent le nœud `:Opportunite` (clé `id`) →
 * pas de contrainte séparée (ce sont des labels additionnels, pas des nœuds).
 */
export const LABEL_KEYS: Record<string, string> = {
  // Cœur opportunités
  Opportunite: 'id',
  OpportuniteType: 'id',
  // Acteurs & référentiels
  Programme: 'id',
  Organisation: 'id',
  Competence: 'id',
  Tag: 'id',
  Secteur: 'libelle', // enum Domaine réifié
  Region: 'nom', // enum Region réifié
  // Bénéficiaire & parcours
  Beneficiaire: 'cjsUid',
  Diplome: 'id',
  Experience: 'id',
  Certificat: 'id',
  // Agenda & ressources pédagogiques
  Evenement: 'id',
  RessourcePedagogique: 'id',
  // Centres & ressources physiques (biblio physique = Lot 3)
  Centre: 'id',
  Salle: 'id',
  Vehicule: 'id',
}

/** Index secondaires accélérant les filtres de matching les plus fréquents. */
export const INDEX_SPECS: ReadonlyArray<readonly [string, string]> = [
  ['Opportunite', 'statut'],
  ['Opportunite', 'domaine'],
  ['Opportunite', 'region'],
  ['Opportunite', 'deadline'],
  ['Competence', 'slug'],
  ['Beneficiaire', 'region'],
  ['Evenement', 'statut'],
]

/** Crée contraintes + index. Idempotent — à exécuter avant toute projection. */
export async function ensureGraphSchema(): Promise<void> {
  await ensureConstraints(LABEL_KEYS)
  await ensureIndexes(INDEX_SPECS)
}
