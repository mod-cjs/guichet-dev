// Client Orange SMS Pro (Sénégal) — GUIC-552.
// Contrat repris de la lib PHP de référence du SSO :
//   key = HMAC-SHA1( token + subject + signature + recipient + content + timestamp , api_key )
//   auth HTTP Basic login:token · requête GET query-string · recipient au format 221XXXXXXXXX (sans '+').
// Les identifiants vivent en env (ORANGE_SMS_*) — jamais en dur.

import { createHmac } from 'crypto'
import { logger } from '@/lib/logger'

/** Erreur d'envoi SMS portant le status HTTP (exploité par le canal pour permanent vs retry). */
export type OrangeSmsError = Error & { status?: number }

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Orange SMS: variable d'environnement ${name} manquante`)
  return v
}

/** Normalise un numéro E.164 (+221…) vers le format attendu par Orange (221…, sans '+'). */
export function toOrangeRecipient(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

/**
 * Envoie un SMS transactionnel via Orange SMS Pro.
 * @param recipient numéro E.164 (`+221XXXXXXXXX`) — le `+` est retiré automatiquement.
 * @param content   texte du message.
 * @throws {OrangeSmsError} en cas de réponse HTTP non-ok (avec `.status`).
 */
export async function sendOrangeSms(recipient: string, content: string): Promise<void> {
  const login = env('ORANGE_SMS_LOGIN')
  const apiKey = env('ORANGE_SMS_API_KEY')
  const token = env('ORANGE_SMS_TOKEN')
  const signature = env('ORANGE_SMS_SIGNATURE')
  const subject = env('ORANGE_SMS_SUBJECT')
  const baseUrl = env('ORANGE_SMS_BASE_URL')
  const verifySSL = process.env.ORANGE_SMS_VERIFY_SSL === 'true'

  const to = toOrangeRecipient(recipient)
  const timestamp = Math.floor(Date.now() / 1000)
  const key = createHmac('sha1', apiKey)
    .update(token + subject + signature + to + content + String(timestamp))
    .digest('hex')

  const params = new URLSearchParams({
    token,
    subject,
    signature,
    recipient: to,
    content,
    timestamp: String(timestamp),
    key,
  })

  const init: RequestInit = {
    method: 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${login}:${token}`).toString('base64'),
      Accept: 'application/json',
    },
  }

  // L'endpoint Orange présente un certificat auto-signé côté SSO : dispatcher tolérant si demandé.
  if (!verifySSL) {
    try {
      const { Agent } = await import('undici')
      ;(init as { dispatcher?: unknown }).dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      })
    } catch {
      logger.warn('[orange-sms] undici indisponible — TLS strict conservé')
    }
  }

  const res = await fetch(`${baseUrl}?${params.toString()}`, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err: OrangeSmsError = new Error(`Orange SMS error: ${res.status} — ${body}`)
    err.status = res.status
    throw err
  }
}
