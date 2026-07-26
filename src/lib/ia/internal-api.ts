// Invocateur d'API interne pour Yaye (GUIC-262, Lots 4 & F6).
//
// ⚠️ INVARIANT : Yaye ne réimplémente PAS les fonctionnalités. Quand un endpoint
// EXISTE déjà (badge, candidature…), l'outil l'invoque TEL QUEL, en process, en
// propageant le cookie de session de la requête courante. Aucune logique métier
// dupliquée ; le service appelé reste inchangé.
//
// Hors contexte authentifié par cookie (ex. WhatsApp), l'endpoint répond 401 →
// l'outil bascule sur un lien web (`unauthenticated`).

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { buildActorCookieHeader } from './actor-session'

type RouteHandler = (req: NextRequest) => Promise<Response>

export interface InternalApiResult {
  status: number
  ok: boolean
  json: { data?: unknown; error?: { code?: string; message?: string; [k: string]: unknown } }
  /** true si 401 (pas de cookie de session) → proposer le web. */
  unauthenticated: boolean
}

/** Reconstruit l'en-tête Cookie de la requête courante (vide hors contexte web). */
async function currentCookieHeader(): Promise<string> {
  try {
    const store = await cookies()
    return store.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  } catch {
    return ''
  }
}

/**
 * Appelle un route handler EXISTANT (sans le modifier) en propageant la session.
 *
 * Hors contexte web (WhatsApp), il n'y a pas de cookie : si l'appelant fournit
 * `actorCjsUid` — une identité DÉJÀ vérifiée par l'agent (binding du lien magique SSO) —
 * on frappe une session éphémère de 60 s pour cette personne (cf. actor-session.ts).
 * Sans identité exploitable, on laisse l'endpoint répondre 401 et l'outil bascule
 * sur un lien web, comme avant.
 *
 * @param handler Le `GET`/`POST` importé depuis `@/app/api/...`.
 */
export async function callInternalRoute(
  handler: RouteHandler,
  opts: { method: 'GET' | 'POST'; path: string; body?: unknown; actorCjsUid?: string | null },
): Promise<InternalApiResult> {
  const cookie = (await currentCookieHeader()) || (opts.actorCjsUid ? (await buildActorCookieHeader(opts.actorCjsUid)) ?? '' : '')
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: opts.method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  }
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body)

  let res: Response
  try {
    res = await handler(new NextRequest(`http://internal.local${opts.path}`, init))
  } catch (err) {
    logger.warn('[yaye:internal-api] appel endpoint échoué', { path: opts.path, err: String(err) })
    return { status: 502, ok: false, json: { error: { message: 'Service indisponible.' } }, unauthenticated: false }
  }

  const json = (await res.json().catch(() => ({}))) as InternalApiResult['json']
  return { status: res.status, ok: res.ok, json, unauthenticated: res.status === 401 }
}
