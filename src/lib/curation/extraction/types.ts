/** GUIC-598 — US-3 : champs extraits d'une opportunité (cascade déterministe, sans LLM). */
export interface ChampsExtraits {
  titre?: string
  description?: string
  organisation?: string
  /** Région : valeur enum `Region` du Guichet si mappée, sinon texte brut. */
  region?: string
  /** Texte de région d'origine quand `region` a été mappé sur l'enum. */
  regionTexte?: string
  /** Domaine : valeur enum `Domaine` si mappée, sinon texte brut. */
  domaine?: string
  /** Texte de domaine d'origine quand `domaine` a été mappé sur l'enum. */
  domaineTexte?: string
  /** Type d'opportunité (id OpportuniteType), imposé par la source. */
  typeId?: string
  /** Slug de type déduit du @type schema.org (résolu en id par l'appelant si pas de typeId). */
  typeSlugSchemaOrg?: string
  /** Deadline normalisée ISO `yyyy-mm-dd`. */
  deadline?: string
  /** Lien vers l'annonce source (toujours présent). */
  lienSource: string
}

export interface ResultatExtraction {
  champs: ChampsExtraits
  /** Complétude 0..100 = champs métier trouvés / total. */
  scoreCompletude: number
}

/** Champs métier comptés pour le score (hors lienSource, toujours présent). */
export const CHAMPS_SCORE = [
  'titre',
  'description',
  'organisation',
  'region',
  'domaine',
  'deadline',
] as const
