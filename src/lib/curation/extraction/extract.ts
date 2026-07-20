import { type ChampsExtraits, type ResultatExtraction, CHAMPS_SCORE } from './types'
import { extraireJsonLd } from './jsonld'
import { extraireParSelecteurs } from './selecteurs'
import { extraireMeta } from './meta'
import { parseDateFr } from './dates'

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

  const trouves = CHAMPS_SCORE.filter((c) => Boolean(champs[c])).length
  return { champs, scoreCompletude: Math.round((trouves / CHAMPS_SCORE.length) * 100) }
}

/** Dernier filet : première date FR/ISO trouvée dans le texte brut. */
function filetRegex(html: string): Partial<ChampsExtraits> {
  const out: Partial<ChampsExtraits> = {}
  const m = html.match(
    /\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s*(?:er)?\s+[a-zéûà]+\s+\d{4}/i,
  )
  if (m) {
    const iso = parseDateFr(m[0])
    if (iso) out.deadline = iso
  }
  return out
}
