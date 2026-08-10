import { type ChampsExtraits, type ResultatExtraction, CHAMPS_SCORE } from './types'
import { extraireJsonLd, extraireTypeSchemaOrg } from './jsonld'
import { extraireParSelecteurs } from './selecteurs'
import { extraireMeta } from './meta'
import { parseDateFr } from './dates'
import { mapperRegion, mapperDomaine, slugTypeSchemaOrg } from './mapping'

/**
 * GUIC-598 — US-3 : cascade déterministe (SANS LLM). Pour chaque champ, on prend la
 * PREMIÈRE valeur non vide dans l'ordre de fiabilité : JSON-LD → sélecteurs configurés
 * → meta/og → filet regex. Le type est celui de la source (l'admin affine en US-5).
 */

export interface OptionsExtraction {
  url: string
  typeDefautId?: string | null
  /** Sélecteurs CSS par champ (config de la source). */
  champs?: Record<string, string>
}

const CHAMPS_TEXTE = ['titre', 'description', 'organisation', 'region', 'domaine'] as const

export function extraireOpportunite(html: string, opts: OptionsExtraction): ResultatExtraction {
  const sources: Array<Partial<ChampsExtraits>> = [
    extraireJsonLd(html),
    opts.champs ? extraireParSelecteurs(html, opts.champs) : {},
    extraireMeta(html),
    filetRegex(html),
  ]

  const champs: ChampsExtraits = { lienSource: opts.url }
  if (opts.typeDefautId) champs.typeId = opts.typeDefautId

  for (const cle of CHAMPS_TEXTE) {
    for (const s of sources) {
      const v = s[cle]
      if (v) {
        champs[cle] = v
        break
      }
    }
  }
  for (const s of sources) {
    if (s.deadline) {
      champs.deadline = s.deadline
      break
    }
  }

  // Mapping vers les enums du Guichet (exploitable en publication US-6). On garde aussi
  // le texte brut dans `regionTexte`/`domaineTexte` pour que l'admin voie l'origine.
  const region = mapperRegion(champs.region)
  if (region) {
    champs.regionTexte = champs.region
    champs.region = region
  }
  const domaine = mapperDomaine(champs.domaine)
  if (domaine) {
    champs.domaineTexte = champs.domaine
    champs.domaine = domaine
  }
  // Type dérivé du @type schema.org si la source n'en impose pas (résolu en id par l'appelant).
  if (!champs.typeId) {
    const slug = slugTypeSchemaOrg(extraireTypeSchemaOrg(html))
    if (slug) champs.typeSlugSchemaOrg = slug
  }

  return { champs, scoreCompletude: calculerScore(champs) }
}

/** Score de complétude 0..100 = champs métier trouvés / total. Recalculable après enrichissement. */
export function calculerScore(champs: ChampsExtraits): number {
  const trouves = CHAMPS_SCORE.filter((c) => Boolean(champs[c])).length
  return Math.round((trouves / CHAMPS_SCORE.length) * 100)
}

// Un LABEL d'échéance (pas une date de publication) suivi d'une date, dans une fenêtre bornée.
// fix #1 : une date « nue » (souvent la date de publi de l'article) n'est JAMAIS une deadline.
const LABEL_DEADLINE =
  /(date\s+limite|d[ée]lai|cl[ôo]ture|avant\s+le|au\s+plus\s+tard|deadline|[ée]ch[ée]ance|expire|expiration|derni[eè]?re?\s+jour|jusqu['’]au|date\s+butoir)/i
const MOTIF_DATE = /\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:er)?\s+[a-zéûà]+\s+\d{4}/i

/** Dernier filet : date trouvée UNIQUEMENT à proximité d'un label d'échéance. Borné (perf/ReDoS). */
function filetRegex(html: string): Partial<ChampsExtraits> {
  const out: Partial<ChampsExtraits> = {}
  const texte = html.slice(0, 200_000)
  const label = LABEL_DEADLINE.exec(texte)
  if (!label) return out
  // Fenêtre de ~80 caractères après le label (« Date limite : 30 août 2026 »).
  const fenetre = texte.slice(label.index, label.index + label[0].length + 80)
  const m = MOTIF_DATE.exec(fenetre)
  if (m) {
    const iso = parseDateFr(m[0])
    if (iso) out.deadline = iso
  }
  return out
}
