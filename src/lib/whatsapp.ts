// Client Meta Cloud API v19 — Agent Yaye (Guichet Jeunesse)
// Distinct de Fatou (EduPop) — voir docs/metier.md

import { htmlToPlainText } from '@/lib/rich-html'

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

/** Bouton de réponse interactif Meta (max 3, titre ≤ 20 car.). */
export interface WhatsAppButton {
  /** Renvoyé tel quel par le webhook au tap (on y encode la valeur d'action). */
  id: string
  title: string
}

/** Ligne d'une liste interactive Meta (max 10, titre ≤ 24 car., description ≤ 72). */
export interface WhatsAppRow {
  id: string
  title: string
  description?: string
}

async function postWhatsApp(payload: Record<string, unknown>, kind: string): Promise<void> {
  const res = await fetch(`${WA_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp ${kind} error: ${res.status} — ${err}`)
  }
}

/**
 * Message interactif à BOUTONS de réponse (GUIC-317). Limites Meta appliquées :
 * 3 boutons max, titre ≤ 20 car., corps ≤ 1024 car. Au tap, le webhook reçoit
 * `interactive.button_reply.id`.
 */
export async function sendInteractiveButtons(to: string, body: string, buttons: WhatsAppButton[]): Promise<void> {
  await postWhatsApp(
    {
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body.slice(0, 1024) },
        action: {
          buttons: buttons.slice(0, 3).map(b => ({
            type: 'reply',
            reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
          })),
        },
      },
    },
    'interactive-buttons',
  )
}

/**
 * Message interactif à LISTE déroulante (GUIC-317). Limites Meta : 10 lignes max,
 * titre ≤ 24 car., description ≤ 72, label bouton ≤ 20. Au tap : `interactive.list_reply.id`.
 */
export async function sendInteractiveList(to: string, body: string, buttonLabel: string, rows: WhatsAppRow[]): Promise<void> {
  await postWhatsApp(
    {
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body.slice(0, 1024) },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [
            {
              title: 'Options',
              rows: rows.slice(0, 10).map(r => ({
                id: r.id.slice(0, 200),
                title: r.title.slice(0, 24),
                ...(r.description ? { description: htmlToPlainText(r.description).slice(0, 72) } : {}),
              })),
            },
          ],
        },
      },
    },
    'interactive-list',
  )
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
