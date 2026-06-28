import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, sendTextMessage } from '@/lib/whatsapp'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/ia/agent'
import { sendYayeBlocksToWhatsApp, shouldSuggestWeb, webSwitchMessage } from '@/lib/ia/format-whatsapp'
import { logAgentEvent } from '@/lib/ia/agent-logs'
import { loadContext, saveContext, userContextKey, TTL_USER } from '@/lib/ia/context'
import { loadSummary, updateSummary } from '@/lib/ia/memory'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Idempotence webhooks WhatsApp — TTL 7 jours (CLAUDE.md, GUIC-240)
const IDEMPOTENCY_TTL = 7 * 24 * 3600
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://guichet.consortiumjeunessesenegal.org').replace(/\/$/, '')

/** Crée la conversation si absente (le binding cjs_uid se fait via lien magique SSO, hors webhook). */
async function ensureConversation(telephone: string): Promise<void> {
  try {
    await prisma.conversationWhatsApp.upsert({ where: { telephone }, create: { telephone }, update: {} })
  } catch (err) {
    logger.warn('whatsapp: upsert conversation échec', { err: String(err) })
  }
}

/**
 * Traite un message texte WhatsApp avec le MÊME moteur que le web (`runAgent`).
 * - Résout le `cjs_uid` via le binding `ConversationWhatsApp` (lien magique SSO).
 * - Non lié → message d'invitation à connecter son compte.
 * - Lié → agent (canal whatsapp) + formateur texte + contexte Redis 7 j.
 */
async function handleWhatsAppText(from: string, text: string): Promise<void> {
  const telephone = from.startsWith('+') ? from : `+${from}`

  let conv: { id: string; cjsUid: string | null } | null = null
  try {
    conv = await prisma.conversationWhatsApp.findUnique({
      where: { telephone },
      select: { id: true, cjsUid: true },
    })
  } catch (err) {
    logger.warn('whatsapp: lookup conversation échec', { err: String(err) })
  }

  if (!conv?.cjsUid) {
    await ensureConversation(telephone)
    await sendTextMessage(
      from,
      `Bonjour, je suis Yaye, la conseillère du Guichet Jeunesse CJS. Pour t'accompagner ` +
        `personnellement (offres, candidatures, badge), connecte ton compte : ${APP_URL}`,
    )
    return
  }

  // Mémoire unifiée par utilisateur → la conversation WhatsApp PROLONGE celle du web
  // (et inversement), au lieu d'un historique cloisonné par téléphone.
  const ctxKey = userContextKey(conv.cjsUid)
  const history = await loadContext(ctxKey)
  const memo = await loadSummary(conv.cjsUid) // mémoire long terme (cross-canal)
  const result = await runAgent({
    message: text,
    history,
    memo,
    cjsUid: conv.cjsUid,
    roles: ['beneficiaire'], // WhatsApp = bénéficiaires ; le staff passe par le web
    sessionId: conv.id,
    canal: 'whatsapp',
  })

  // Formateur multi-canal (Lot 5) : texte + boutons/listes interactives Meta.
  const { formats } = await sendYayeBlocksToWhatsApp(from, result.blocks)
  const logBase = { sessionId: conv.id, cjsUid: conv.cjsUid, role: 'beneficiaire', canal: 'whatsapp' as const }
  await logAgentEvent({ ...logBase, typeEvenement: 'format_canal', formatCanal: formats.join('+') })
  await logAgentEvent({ ...logBase, typeEvenement: 'contenu_transmis', payload: { formats, blocs: result.blocks.map(b => b.kind) } })

  // Bascule web après plusieurs échanges (deep link SSO), une seule fois.
  if (shouldSuggestWeb(history.length)) await sendTextMessage(from, webSwitchMessage())

  await saveContext(
    ctxKey,
    [...history, { role: 'user', content: text }, { role: 'assistant', content: result.reply }],
    TTL_USER,
  )
  // Met à jour la fiche mémoire long terme — fire-and-forget (cross-canal).
  void updateSummary(conv.cjsUid, memo, text, result.reply)
}

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
      changes?: Array<{ value?: { messages?: Array<{
        id?: string
        type?: string
        from?: string
        text?: { body?: string }
        interactive?: { type?: string; button_reply?: { id?: string }; list_reply?: { id?: string } }
      }> } }>
    }>
  })?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

  // Réponse à un message interactif (tap d'un bouton/élément de liste) : l'`id`
  // porte la valeur d'action (encodée par le formateur Lot 5).
  const interactiveValue =
    message?.type === 'interactive'
      ? message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id
      : undefined

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

  const userText = message?.type === 'text' ? message.text?.body : interactiveValue
  if (message?.from && userText) {
    // Fail-soft : un échec ne doit pas faire répondre 500 à Meta (qui rejouerait le message).
    try {
      await handleWhatsAppText(message.from, userText)
    } catch (err) {
      logger.error('whatsapp: traitement message échec', { err: String(err) })
    }
  }
  return new Response('OK', { status: 200 })
}
