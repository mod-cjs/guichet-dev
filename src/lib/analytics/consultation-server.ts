/**
 * Adaptateur serveur des consultations — GUIC-688.
 * Spec : `.agent_context/specs/GUIC-688-consultations-multicanal.md`.
 *
 * Sépare ce qui dépend de Next (`headers()`, paramètres d'URL) du socle
 * `consultations.ts`, qui reste testable sans runtime Next.
 *
 * CONVENTION D'URL
 * - `?src=` porte le CANAL d'où vient le clic : `ia` (card du chat Yaye),
 *   `wa` (lien envoyé sur WhatsApp). Sans lui, un clic depuis WhatsApp
 *   retomberait dans le trafic web organique, sans attribution possible.
 * - `?from=` porte l'ORIGINE : `reco`, `recherche`, `favoris`, `notification`.
 *   Les deux sont indépendants : une reco peut être affichée dans le chat IA
 *   comme sur le tableau de bord web.
 */

import { headers } from 'next/headers'
import {
  canalFromSrc,
  trackConsultation,
  type EntiteConsultableValue,
  type OrigineConsultationValue,
} from './consultations'

/** Premier élément utile d'un paramètre d'URL éventuellement répété. */
function premier(valeur?: string | string[] | null): string | undefined {
  if (Array.isArray(valeur)) return valeur[0]
  return valeur ?? undefined
}

/**
 * IP cliente — `x-real-ip` (injecté par le proxy) puis `x-forwarded-for`.
 * Même logique que les routes API existantes, pour que le dédoublonnage soit
 * cohérent entre pages et endpoints.
 */
export async function ipDepuisHeaders(): Promise<string> {
  const h = await headers()
  const real = h.get('x-real-ip')
  if (real) return real.trim()
  const fwd = h.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || 'no-ip'
}

/** `?from=` → origine métier. `reco` est l'alias court utilisé dans les liens. */
export function origineFromParam(from?: string | string[] | null): OrigineConsultationValue {
  const valeur = premier(from)
  if (valeur === 'reco') return 'reco_ia'
  if (valeur === 'recherche' || valeur === 'favoris' || valeur === 'notification') return valeur
  return 'direct'
}

export interface TrackVuePageInput {
  typeEntite: EntiteConsultableValue
  entiteId:   string
  /** `searchParams.src` brut (peut être répété par le client). */
  src?:       string | string[] | null
  /** `searchParams.from` brut. */
  from?:      string | string[] | null
  /** `null` = visiteur anonyme assumé. La page fournit la session, on ne la relit pas. */
  cjsUid?:    string | null
}

/**
 * Enregistre la consultation d'une page détail. Ne throw jamais : un tracking
 * qui casse une page publique serait un très mauvais compromis.
 */
export async function trackVuePage(input: TrackVuePageInput): Promise<void> {
  try {
    const ip = await ipDepuisHeaders()

    await trackConsultation({
      typeEntite: input.typeEntite,
      entiteId:   input.entiteId,
      typeEvent:  'consultation',
      canal:      canalFromSrc(premier(input.src)),
      ...(input.cjsUid ? { cjsUid: input.cjsUid } : {}),
      ip,
      origine:    origineFromParam(input.from),
    })
  } catch {
    // Fail-soft — `trackConsultation` avale déjà ses propres erreurs ; ce filet
    // couvre uniquement la lecture des headers.
  }
}
