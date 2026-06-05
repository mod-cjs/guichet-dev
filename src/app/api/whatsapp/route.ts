import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, sendTextMessage } from '@/lib/whatsapp'
import { generateAgentResponse } from '@/lib/ia/rag'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Idempotence webhooks WhatsApp — TTL 7 jours (CLAUDE.md, GUIC-240)
const IDEMPOTENCY_TTL = 7 * 24 * 3600

// Vérification du webhook Meta
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// Réception des messages WhatsApp (agent Yaye)
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const message = (payload as {
    entry?: Array<{
      changes?: Array<{ value?: { messages?: Array<{ id?: string; type?: string; from?: string; text?: { body?: string } }> } }>
    }>
  })?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

  // Idempotence (GUIC-240) : Meta peut renvoyer 3× le même message en cas
  // de timeout côté Guichet. On enregistre `message.id` dans Redis avec
  // SET NX TTL 7j → 2e POST renvoie {idempotent:true} sans rejouer le LLM.
  if (message?.id) {
    const key = `guichet:whatsapp:processed:${message.id}`
    try {
      // ioredis : redis.set(key, val, 'EX', ttl, 'NX') → null si déjà existant
      const stored = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX')
      if (stored === null) {
        logger.info('whatsapp-webhook: doublon ignoré', { messageId: message.id })
        return NextResponse.json({ ok: true, idempotent: true })
      }
    } catch (err) {
      // fail-open : si Redis est indisponible, on traite (cohérent avec webhook SSO)
      logger.warn('whatsapp-webhook: idempotence Redis indisponible', { error: String(err) })
    }
  }

  if (message?.type === 'text' && message.from && message.text?.body) {
    const from = message.from
    const text = message.text.body
    const response = await generateAgentResponse(text, '', [])
    await sendTextMessage(from, response)
  }
  return new Response('OK', { status: 200 })
}
