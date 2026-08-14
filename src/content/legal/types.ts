/**
 * GUIC-605 — Modèle de contenu des documents légaux (CDP).
 *
 * Les textes légaux sont portés par des **données typées**, pas par du JSX
 * littéral. Motif : GUIC-608 devra horodater « la version du texte » à laquelle
 * l'utilisateur a consenti — un document déjà porteur d'un `version` évite de
 * reprendre l'intégralité du contenu au lot suivant.
 *
 * Corollaire : aucun de ces blocs n'est du HTML. Le rendu ne fait jamais de
 * `dangerouslySetInnerHTML`, ce qui retire toute surface XSS sur du contenu
 * pourtant statique.
 */

/** Paragraphe courant. */
export interface BlocParagraphe {
  type: 'paragraphe'
  texte: string
}

/** Liste à puces simple. */
export interface BlocListe {
  type: 'liste'
  items: string[]
}

/**
 * Liste « terme : valeur » (droits, coordonnées, catégories de données).
 * Le terme est rendu en gras, la valeur en corps de texte.
 */
export interface BlocDefinitions {
  type: 'definitions'
  items: { terme: string; valeur: string }[]
}

/** Encart mis en avant (contact d'exercice des droits, réclamation CDP). */
export interface BlocEncart {
  type: 'encart'
  titre?: string
  texte: string
}

export type BlocLegal = BlocParagraphe | BlocListe | BlocDefinitions | BlocEncart

export interface SectionLegale {
  /** Titre de section, rendu en <h2>. Ex. « Article 5 – Durées de conservation ». */
  titre: string
  blocs: BlocLegal[]
}

export interface DocumentLegal {
  /** Segment d'URL sous `/legal/`. */
  slug: string
  /** Titre affiché (<h1>) et base du <title>. */
  titre: string
  /** Résumé court — meta description + chapeau de page. */
  resume: string
  /**
   * Version du texte, format `AAAA-MM`. Sera la valeur horodatée avec le
   * consentement en GUIC-608 — ne jamais la modifier sans changer le contenu.
   */
  version: string
  /** Date de dernière mise à jour, en toutes lettres. Ex. « Mars 2026 ». */
  dateMaj: string
  sections: SectionLegale[]
  /**
   * `true` = document non encore rédigé, publié comme coquille signalée à
   * l'utilisateur. Seuls ces documents peuvent avoir un contenu incomplet
   * (cf. garde dans `tests/unit/legal-documents.test.ts`).
   */
  estCoquille?: boolean
}
