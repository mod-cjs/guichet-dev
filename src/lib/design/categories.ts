/**
 * Catégories couleur du design v5 — GUIC-691 (épic GUIC-689).
 * Référence : `design-guichet-v5/README.md` + Lot 14 (normatif) ; tokens `--cat-*`
 * posés par la fondation GUIC-690.
 *
 * POURQUOI UNE TABLE UNIQUE
 * En v5 la couleur d'une pastille se DÉDUIT du libellé de catégorie. Si chaque
 * écran décidait dans son coin, la même offre finirait teal sur la liste et
 * bleue dans le détail. Cette table est la seule autorité.
 *
 * LE ROUGE N'EST PAS UNE CATÉGORIE : en v5 il ne signale que l'urgence
 * d'échéance (J-3 et moins). D'où son absence complète d'ici — un test le
 * verrouille.
 */

/** Les sept familles couleur déclarées dans `tokens.css` (`--cat-*-soft/-ink`). */
export const CATEGORIES_V5 = [
  'emploi',
  'stage',
  'formation',
  'financement',
  'evenement',
  'volontariat',
  'neutre',
] as const

export type CategorieV5 = (typeof CATEGORIES_V5)[number]

/** Normalise un libellé affiché ou une valeur d'enum : casse, accents, séparateurs. */
function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

/**
 * Table de correspondance. Les clés sont normalisées : `AppelAProjets`,
 * `appel à projets` et `APPEL-A-PROJETS` tombent sur la même entrée.
 */
const TABLE: Record<string, CategorieV5> = {
  // Opportunités — types ayant leur couleur propre
  emploi:          'emploi',
  stage:           'stage',
  formation:       'formation',
  volontariat:     'volontariat',

  // Tout ce qui finance un projet partage la même couleur : le jeune lit
  // « de l'argent pour mon projet », pas la subtilité juridique du dispositif.
  bourse:          'financement',
  financement:     'financement',
  appelaprojets:   'financement',

  // Événements (agenda) — Lot 5
  atelier:         'evenement',
  forum:           'evenement',
  webinar:         'evenement',
  conference:      'evenement',
  cours:           'evenement',
  evenement:       'evenement',
}

/**
 * Catégorie couleur d'un libellé métier (type d'opportunité, type d'événement).
 * Retombe sur `neutre` pour tout ce qui n'a pas de couleur assignée — mieux vaut
 * une pastille neutre qu'une couleur inventée qui contredirait un autre écran.
 */
export function categorieDepuisType(type: string | null | undefined): CategorieV5 {
  if (!type) return 'neutre'
  return TABLE[normaliser(type)] ?? 'neutre'
}

/** Classes utilitaires correspondantes (définies dans `src/styles/tokens.css`). */
export function classeCategorie(categorie: CategorieV5): string {
  return `gj-cat gj-cat--${categorie}`
}
