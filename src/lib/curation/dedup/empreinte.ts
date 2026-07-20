import { createHash } from 'node:crypto'

/**
 * GUIC-599 — US-4 : primitives de déduplication de CONTENU (déterministe, sans LLM).
 * Distinct de l'empreinte d'URL d'US-2 : ici on identifie la même annonce vue via des
 * URLs/sources différentes.
 */

/** Minuscule, sans accents, espaces réduits. */
export function normaliser(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Empreinte exacte de contenu : sha256(titre|organisation|deadline) normalisés. Null sans
 * titre. La deadline discrimine deux annonces DISTINCTES au même titre+employeur mais à
 * échéances différentes (2 postes) → empreintes différentes → pas de fusion (GUIC-599 C-1).
 */
export function empreinteContenu(
  titre: string | null | undefined,
  organisation?: string | null,
  deadline?: string | null,
): string | null {
  const t = normaliser(titre)
  if (!t) return null
  return createHash('sha256')
    .update(`${t}|${normaliser(organisation)}|${(deadline ?? '').trim()}`)
    .digest('hex')
}

/** Mots significatifs du titre (≥ 3 caractères), pour la similarité floue. Unicode (Sénégal : arabe/wolof). */
export function tokensTitre(titre: string | null | undefined): Set<string> {
  const n = normaliser(titre)
  const out = new Set<string>()
  for (const mot of n.split(/[^\p{L}\p{N}]+/u)) {
    if (mot.length >= 3) out.add(mot)
  }
  return out
}

export function similariteJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/** Seuil de similarité titre au-delà duquel deux annonces sont quasi-doublons. */
export const SEUIL_SIMILARITE = 0.7
