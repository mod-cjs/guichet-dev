import { NextRequest } from 'next/server'
import { verifyWebhookSignature, sendTextMessage } from '@/lib/whatsapp'
import { generateAgentResponse } from '@/lib/ia/rag'

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
  const signature = request.headers.get('x-hub-signature-256') ?? ''
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Forbidden', { status: 403 })
  }
  const payload = JSON.parse(body)
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (message?.type === 'text') {
    const from = message.from
    const text = message.text.body
    const response = await generateAgentResponse(text, '', [])
    await sendTextMessage(from, response)
  }
  return new Response('OK', { status: 200 })
}
