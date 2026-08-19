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
import { logger } from '@/lib/logger'
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

/**
 * User-agent brut — complète l'IP pour distinguer les visiteurs anonymes. Il
 * n'est jamais stocké : le socle le hache avec l'IP pour produire le sujet.
 */
export async function userAgentDepuisHeaders(): Promise<string | undefined> {
  const h = await headers()
  return h.get('user-agent')?.slice(0, 512) || undefined
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
    const [ip, userAgent] = await Promise.all([ipDepuisHeaders(), userAgentDepuisHeaders()])

    await trackConsultation({
      typeEntite: input.typeEntite,
      entiteId:   input.entiteId,
      typeEvent:  'consultation',
      canal:      canalFromSrc(premier(input.src)),
      ...(input.cjsUid ? { cjsUid: input.cjsUid } : {}),
      ip,
      ...(userAgent ? { userAgent } : {}),
      origine:    origineFromParam(input.from),
    })
  } catch (err) {
    // Fail-soft, mais plus muet : c'est ce silence qui a laissé la mesure des
    // six pages détail à zéro sans que rien ne l'indique (GUIC-689).
    logger.warn('[consultations] vue de page non enregistrée', {
      typeEntite: input.typeEntite,
      error:      err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Prépare l'enregistrement d'une vue de page, à confier à `after()`.
 *
 * GUIC-689 — L'ORDRE EST LE FOND DU SUJET. Les six pages détail faisaient
 * `after(() => trackVuePage({...}))` : la lecture de `headers()` partait donc
 * dans le callback, exécuté une fois la réponse envoyée. Next refuse alors
 * l'accès aux données de requête (« Route /x used `headers` … »), le
 * `catch` avalait l'erreur, et AUCUNE consultation n'était écrite — ni en
 * dev, ni en production. Le compteur `vues` restait à zéro sans un signe.
 *
 * On lit donc la requête MAINTENANT — tant qu'elle existe — et on ne diffère
 * que l'écriture. La signature impose cet ordre : pour obtenir la fonction à
 * passer à `after()`, il faut l'attendre pendant le rendu.
 *
 *     after(await differerVuePage({ typeEntite: 'ressource', entiteId: id }))
 */
export async function differerVuePage(
  input: TrackVuePageInput,
): Promise<() => Promise<void>> {
  // Lecture immédiate, fail-soft : une requête illisible ne doit pas casser
  // le rendu de la page, seulement dégrader la finesse de la mesure.
  let ip = 'no-ip'
  let userAgent: string | undefined
  try {
    ;[ip, userAgent] = await Promise.all([ipDepuisHeaders(), userAgentDepuisHeaders()])
  } catch (err) {
    logger.warn('[consultations] requête illisible, mesure dégradée', {
      typeEntite: input.typeEntite,
      error:      err instanceof Error ? err.message : String(err),
    })
  }

  const canal = canalFromSrc(premier(input.src))
  const origine = origineFromParam(input.from)

  return async () => {
    await trackConsultation({
      typeEntite: input.typeEntite,
      entiteId:   input.entiteId,
      typeEvent:  'consultation',
      canal,
      ...(input.cjsUid ? { cjsUid: input.cjsUid } : {}),
      ip,
      ...(userAgent ? { userAgent } : {}),
      origine,
    })
  }
}
