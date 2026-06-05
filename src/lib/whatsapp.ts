// Client Meta Cloud API v19 — Agent Yaye (Guichet Jeunesse)
// Distinct de Fatou (EduPop) — voir docs/metier.md

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`

export async function sendTextMessage(to: string, text: string): Promise<void> {
  const res = await fetch(`${WA_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error: ${res.status} — ${err}`)
  }
}

/**
 * Envoie un message via un template Meta pré-approuvé (GUIC-21).
 * Obligatoire pour les messages business-initiés hors fenêtre de service 24 h.
 * En cas d'échec HTTP, l'erreur levée porte un champ `status`.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[]
): Promise<void> {
  const res = await fetch(`${WA_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: bodyParams.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(
      `WhatsApp template error: ${res.status} — ${body}`
    ) as Error & { status: number }
    err.status = res.status
    throw err
  }
}

import { createHmac, timingSafeEqual } from 'node:crypto'
import { logger } from '@/lib/logger'

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook Meta WhatsApp.
 *
 * Sécurité (GUIC-240) :
 * - Utilise `WHATSAPP_APP_SECRET` (Meta App Secret dédié au HMAC webhook),
 *   PAS `WHATSAPP_TOKEN` (bearer token pour l'API outbound — exposable côté
 *   logs Meta et beaucoup plus permissif).
 * - Comparaison `timingSafeEqual` (anti timing-attack) avec check longueur strict.
 * - Retourne `false` sans throw si la signature est absente, mal formée, ou si
 *   `WHATSAPP_APP_SECRET` n'est pas configuré (fail-closed).
 *
 * Meta envoie le header au format `sha256=<hex>` (`x-hub-signature-256`).
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null | undefined
): boolean {
  if (!signature) return false

  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    logger.error('[whatsapp] WHATSAPP_APP_SECRET non défini — webhook refusé')
    return false
  }

  const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const expected = createHmac('sha256', appSecret).update(payload).digest('hex')

  if (provided.length !== expected.length) return false

  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
