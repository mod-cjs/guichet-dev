/** GUIC-598 — US-3 : champs extraits d'une opportunité (cascade déterministe, sans LLM). */
export interface ChampsExtraits {
  titre?: string
  description?: string
  organisation?: string
  region?: string
  domaine?: string
  /** Type d'opportunité (id OpportuniteType), dérivé de la source ou du @type JSON-LD. */
  typeId?: string
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
