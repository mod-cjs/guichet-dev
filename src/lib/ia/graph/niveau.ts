// Ordre des niveaux d'étude (enum NiveauEtudes) — éligibilité résolue côté app.
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §5 (exemple éligibilité)
//
// Le niveau se compare par PROPRIÉTÉ (pas par traversée) : on calcule côté app la
// liste des niveaux requis ≤ niveau du bénéficiaire, et on l'injecte en paramètre
// (`$allowedNiveaux`) — Neo4j ne connaît pas l'ordre de l'enum.

import { NiveauEtudes } from '@prisma/client'

/** Ordre croissant de l'enum `NiveauEtudes`. */
export const NIVEAU_ORDER: NiveauEtudes[] = [
  NiveauEtudes.BFEM,
  NiveauEtudes.BAC,
  NiveauEtudes.BAC_PLUS_2,
  NiveauEtudes.BAC_PLUS_3,
  NiveauEtudes.BAC_PLUS_5,
  NiveauEtudes.DOCTORAT,
]

const RANK = new Map<string, number>(NIVEAU_ORDER.map((n, i) => [n, i]))

/** Rang d'un niveau (ou -1 si inconnu/null). */
export function niveauRank(niveau: string | null | undefined): number {
  return niveau ? RANK.get(niveau) ?? -1 : -1
}

/**
 * Niveaux requis qu'un bénéficiaire de niveau `niveau` peut couvrir (≤ son niveau).
 * Niveau inconnu → tableau vide (on s'appuie alors sur `niveauEtudeMin IS NULL`).
 */
export function allowedNiveaux(niveau: string | null | undefined): NiveauEtudes[] {
  const rank = niveauRank(niveau)
  if (rank < 0) return []
  return NIVEAU_ORDER.slice(0, rank + 1)
}
