import { Region, Domaine } from '@prisma/client'

/**
 * GUIC-598 — US-3 : mapping du texte extrait vers les enums du Guichet, pour que le
 * pré-remplissage soit réellement exploitable en publication (US-6). Insensible aux
 * accents/casse. Renvoie `undefined` si aucun match fiable (l'admin tranche en US-5).
 */

function normal(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const REGIONS: Record<string, Region> = {
  dakar: Region.Dakar,
  thies: Region.Thies,
  diourbel: Region.Diourbel,
  fatick: Region.Fatick,
  kaolack: Region.Kaolack,
  kaffrine: Region.Kaffrine,
  louga: Region.Louga,
  'saint-louis': Region.Saint_Louis,
  'saint louis': Region.Saint_Louis,
  matam: Region.Matam,
  tambacounda: Region.Tambacounda,
  kedougou: Region.Kedougou,
  kolda: Region.Kolda,
  ziguinchor: Region.Ziguinchor,
  sedhiou: Region.Sedhiou,
}

/**
 * Synonymes/mots-clés → domaine. Le premier trouvé dans le texte l'emporte,
 * d'où l'ordre : du plus spécifique au plus large.
 *
 * GUIC-689 — réécrite pour la taxonomie à six catégories. Trois anciens
 * domaines (numérique, agriculture, entrepreneuriat) fusionnent dans
 * `Economie`, qui devient le plus large : il passe donc en dernier.
 *
 * « bourse » a été RETIRÉ des mots-clés : c'est un TYPE d'offre, pas un thème.
 * Il envoyait une bourse agricole vers l'éducation, quel que soit son sujet.
 */
const DOMAINES: Array<[RegExp, Domaine]> = [
  [/\bsante|medical|medecine|infirmier|soin|bien-?etre|mental|psycho/, Domaine.BienEtre],
  [/citoyen|civique|gouvernance|droits|benevol/, Domaine.Citoyennete],
  // `\b` obligatoire : sans lui, « agriculture » contient « culture » et une
  // offre agricole partait en Culture. L'ancien ordre masquait le piège —
  // Agriculture était testé avant. On ne s'appuie plus sur l'ordre pour ça.
  [/\bculture|\bart\b|\barts\b|musique|patrimoine|cinema/, Domaine.Culture],
  [/environnement|climat|\becologie|energie|dechet|biodiversite/, Domaine.Ecologie],
  [/education|formation|enseignement|scolaire|pedagog|insertion|orientation|employabilite/, Domaine.Employabilite],
  [/informatique|numerique|digital|tech|logiciel|data|developpeur|web|agricole|agriculture|elevage|peche|agro|entrepreneur|entreprise|startup|business|commerce|gestion|finance/, Domaine.Economie],
]

export function mapperRegion(texte: string | undefined): Region | undefined {
  if (!texte) return undefined
  const n = normal(texte)
  if (REGIONS[n]) return REGIONS[n]
  // Match partiel : une région citée dans une adresse plus longue.
  for (const [cle, region] of Object.entries(REGIONS)) {
    if (n.includes(cle)) return region
  }
  return undefined
}

export function mapperDomaine(texte: string | undefined): Domaine | undefined {
  if (!texte) return undefined
  const n = normal(texte)
  for (const [re, dom] of DOMAINES) {
    if (re.test(n)) return dom
  }
  return undefined
}

/** schema.org @type → slug OpportuniteType (résolu en id côté DB par l'appelant). */
const TYPE_SCHEMA: Record<string, string> = {
  jobposting: 'emploi',
  event: 'evenement',
  educationaloccupationalprogram: 'formation',
  course: 'formation',
  scholarship: 'bourse',
  grant: 'bourse',
}

export function slugTypeSchemaOrg(atType: string | undefined): string | undefined {
  if (!atType) return undefined
  return TYPE_SCHEMA[atType.toLowerCase()]
}
