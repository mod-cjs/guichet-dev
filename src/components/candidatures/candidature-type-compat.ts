import type { TypeOpportunite } from '@prisma/client'
import { TYPE_CAT, type CatFamily } from '@/components/opportunites/opportunite-type-meta'
import type { CandidatureMock } from './types'

/**
 * GUIC-689 — compatibilité entre `CandidatureMock['type']` (mock candidatures,
 * 7 valeurs) et l'enum Prisma réel `TypeOpportunite` (6 valeurs) consommé par
 * `OpportuniteTypeChip` / `TYPE_CAT` (source unique du code couleur
 * catégorie, `opportunite-type-meta.ts`).
 *
 * Deux écarts, documentés plutôt que de casser le typage :
 *  - `'Appel à projets'` (libellé mock) ↔ `Appel_a_projets` (valeur enum) —
 *    mappage direct, même catégorie (financement).
 *  - `'Concours'` — absent de l'enum Prisma (aucun type d'opportunité
 *    « Concours » côté back-end aujourd'hui). Pas d'équivalent : le badge
 *    retombe sur un rendu local `cat-neutre`, jamais une couleur de
 *    catégorie empruntée à un autre type (cf. tokens.css : « type inconnu —
 *    badge gris, jamais une couleur de catégorie »).
 *
 * `CandidatureDetail.tsx` ne consomme PAS ce fichier : `CandidatureDetailDTO`
 * porte directement le vrai `TypeOpportunite` Prisma (chargé par
 * `candidature-detail-loader.ts`), donc `TYPE_CAT` / `OpportuniteTypeChip`
 * s'y appliquent sans compat.
 *
 * TODO GUIC-190 (Phase 4) : ce fichier disparaît avec la migration du mock
 * `CandidatureMock` vers le vrai `TypeOpportunite` Prisma côté schéma
 * `Candidature`.
 */
const MOCK_TYPE_TO_ENUM: Partial<Record<CandidatureMock['type'], TypeOpportunite>> = {
  Emploi: 'Emploi',
  Stage: 'Stage',
  Formation: 'Formation',
  Bourse: 'Bourse',
  Volontariat: 'Volontariat',
  'Appel à projets': 'Appel_a_projets',
}

/** Type Prisma équivalent si direct ; `null` si absent de l'enum (`Concours`). */
export function mockTypeToOpportuniteType(type: CandidatureMock['type']): TypeOpportunite | null {
  return MOCK_TYPE_TO_ENUM[type] ?? null
}

/** Famille catégorie d'un type mock — `cat-neutre` si sans équivalent enum. */
export function catFamilyForMockType(type: CandidatureMock['type']): CatFamily {
  const mapped = MOCK_TYPE_TO_ENUM[type]
  return mapped ? TYPE_CAT[mapped] : 'cat-neutre'
}

/**
 * Fond plein + texte blanc par famille catégorie — tuile sectorielle
 * (48 px liste / 56 px détail) des cartes candidature. Même convention que
 * `CAT_HERO_CLASSES` (OpportuniteDetail.tsx) : contraste AA garanti sur
 * chaque teinte `--cat-*` pleine (cf. tokens.css, commentaires « assombri —
 * porte du texte blanc »). Remplace le dégradé `CAND_GRAD` de la maquette
 * design v5 (candidatures-web.jsx) — zéro gradient hors exceptions (CLAUDE.md).
 */
export const CAT_TILE_CLASSES: Record<CatFamily, string> = {
  'cat-emploi':      'bg-cat-emploi text-white',
  'cat-stage':       'bg-cat-stage text-white',
  'cat-formation':   'bg-cat-formation text-white',
  'cat-financement': 'bg-cat-financement text-white',
  'cat-evenement':   'bg-cat-evenement text-white',
  'cat-volontariat': 'bg-cat-volontariat text-white',
  'cat-neutre':      'bg-cat-neutre text-white',
}

/**
 * Fond doux + texte teinte par famille catégorie — badge de repli pour les
 * types mock sans équivalent `TypeOpportunite` (ex. `Concours`). Duplique
 * volontairement les classes de `OpportuniteTypeChip` (`CAT_CLASSES`, non
 * exporté) pour rester visuellement identique au chip officiel.
 */
export const CAT_BADGE_SOFT_CLASSES: Record<CatFamily, string> = {
  'cat-emploi':      'bg-cat-emploi-soft text-cat-emploi-ink',
  'cat-stage':       'bg-cat-stage-soft text-cat-stage-ink',
  'cat-formation':   'bg-cat-formation-soft text-cat-formation-ink',
  'cat-financement': 'bg-cat-financement-soft text-cat-financement-ink',
  'cat-evenement':   'bg-cat-evenement-soft text-cat-evenement-ink',
  'cat-volontariat': 'bg-cat-volontariat-soft text-cat-volontariat-ink',
  'cat-neutre':      'bg-cat-neutre-soft text-cat-neutre-ink',
}
