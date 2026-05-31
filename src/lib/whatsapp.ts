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

import { createHmac } from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const expected = 'sha256=' + createHmac('sha256', process.env.WHATSAPP_TOKEN ?? '')
    .update(payload)
    .digest('hex')
  return signature === expected
}
