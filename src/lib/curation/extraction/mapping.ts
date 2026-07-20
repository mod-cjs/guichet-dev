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

/** Synonymes/mots-clés → domaine. Le premier trouvé dans le texte l'emporte. */
const DOMAINES: Array<[RegExp, Domaine]> = [
  [/informatique|numerique|digital|tech|logiciel|data|developpeur|web/, Domaine.Numerique],
  [/agricole|agriculture|elevage|peche|agro/, Domaine.Agriculture],
  [/entrepreneur|entreprise|startup|business|commerce|gestion/, Domaine.Entrepreneuriat],
  [/citoyen|civique|gouvernance|droits/, Domaine.Citoyennete],
  [/environnement|climat|ecologie|energie|dechet/, Domaine.Environnement],
  [/sante|medical|medecine|infirmier|soin/, Domaine.Sante],
  [/education|formation|enseignement|scolaire|pedagog|bourse|etudes?/, Domaine.Education],
  [/culture|art|musique|patrimoine|cinema/, Domaine.Culture],
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
