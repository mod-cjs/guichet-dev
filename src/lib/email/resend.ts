// Client email via Resend — GUIC-553 (bascule de provider : GCP/Gmail → Resend).
// API transactionnelle simple : POST https://api.resend.com/emails, Bearer RESEND_API_KEY.
// L'expéditeur (RESEND_FROM) doit appartenir à un domaine vérifié côté Resend.

import { logger } from '@/lib/logger'

const RESEND_API_URL = 'https://api.resend.com/emails'

/** Erreur d'envoi portant le status HTTP (exploité par le canal pour permanent vs retry). */
export type ResendError = Error & { status?: number }

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Email Resend: variable d'environnement ${name} manquante`)
  return v
}

/**
 * Envoie un email transactionnel via Resend.
 * @param to      destinataire.
 * @param subject sujet.
 * @param html    corps HTML.
 * @param text    corps texte (fallback ; défaut = HTML débarrassé des balises).
 * @throws {ResendError} en cas de réponse HTTP non-ok (avec `.status`).
 */
export async function sendResendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  const apiKey = env('RESEND_API_KEY')
  const from = env('RESEND_FROM')
  const plain = text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text: plain }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err: ResendError = new Error(`Resend error: ${res.status} — ${body}`)
    err.status = res.status
    throw err
  }
  logger.info('[email-resend] envoyé', { to, subject })
}
