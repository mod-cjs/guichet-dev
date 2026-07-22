// Client email via GCP / Gmail API — GUIC-553.
// Auth = service account (GOOGLE_APPLICATION_CREDENTIALS déjà monté pour Vertex ADC),
// domain-wide delegation impersonant GCP_EMAIL_SENDER, scope gmail.send.
// Envoi d'un message MIME multipart/alternative (texte + HTML aux tokens gj-*).

import { google } from 'googleapis'
import { logger } from '@/lib/logger'

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
const BOUNDARY = 'cjs-notif-boundary-9f2b1c'

/** Encode un en-tête non-ASCII en encoded-word MIME (RFC 2047, base64 UTF-8). */
function encodeHeader(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`
}

/** Construit un message RFC 822 multipart/alternative. */
function buildMime(sender: string, to: string, subject: string, html: string, text: string): string {
  return [
    `From: Guichet Jeunesse <${sender}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${BOUNDARY}"`,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${BOUNDARY}--`,
    '',
  ].join('\r\n')
}

/**
 * Envoie un email transactionnel via l'API Gmail (GCP).
 * @param to      destinataire.
 * @param subject sujet (accents supportés — encodé en encoded-word).
 * @param html    corps HTML.
 * @param text    corps texte (fallback ; défaut = HTML sans balises approximatif).
 * @throws si l'envoi échoue ou si GCP_EMAIL_SENDER est absent.
 */
export async function sendGcpEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  const sender = process.env.GCP_EMAIL_SENDER
  if (!sender) throw new Error('Email GCP: variable GCP_EMAIL_SENDER manquante')

  const plain = text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const mime = buildMime(sender, to, subject, html, plain)
  const raw = Buffer.from(mime, 'utf-8').toString('base64url')

  const auth = new google.auth.GoogleAuth({
    scopes: [GMAIL_SEND_SCOPE],
    clientOptions: { subject: sender }, // domain-wide delegation impersonation
  })
  const gmail = google.gmail({ version: 'v1', auth })

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
  logger.info('[email-gcp] envoyé', { to, subject })
}
