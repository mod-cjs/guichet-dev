import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { StatutCompte, type Region } from '@prisma/client'
import type { ApiResponse } from '@/types/api'

// ── Signature ─────────────────────────────────────────────────────────────────
// Format SSO : HMAC-SHA256(webhook_secret, X-CJS-Timestamp + "\n" + body_json)

function verifySignature(timestamp: string, signature: string, body: string): boolean {
  const secret = process.env.SSO_WEBHOOK_SECRET
  if (!secret || !timestamp || !signature) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false

  const expected = createHmac('sha256', secret).update(timestamp + '\n' + body).digest('hex')

  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

// ── Idempotence Redis ─────────────────────────────────────────────────────────
// Clé : webhook:sso:{event}:{cjs_uid}:{payload_timestamp}
// TTL  : 7 jours (RFC CLAUDE.md)

const IDEMPOTENCY_TTL = 7 * 24 * 3600

async function isAlreadyProcessed(event: string, cjsUid: string, ts: string): Promise<boolean> {
  const key = `guichet:webhook:sso:${event}:${cjsUid}:${ts}`
  try {
    const set = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX')
    return set === null // null = clé existait déjà → doublon
  } catch {
    return false // fail-open : traiter en cas d'indisponibilité Redis
  }
}

// ── Validation payload ────────────────────────────────────────────────────────

const payloadSchema = z.object({
  event:     z.enum(['user.provisioned', 'user.updated', 'user.anonymized']),
  cjs_uid:   z.string().uuid(),
  timestamp: z.string(),
  data: z.object({
    email:      z.string().email().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name:  z.string().nullable().optional(),
    phone:      z.string().nullable().optional(),
    region:     z.string().nullable().optional(),
    status:     z.string().nullable().optional(),
    roles:      z.array(z.string()).optional(),
  }),
})

type Payload = z.infer<typeof payloadSchema>

// ── Handlers par événement ────────────────────────────────────────────────────

async function handleProvisioned(p: Payload): Promise<void> {
  await prisma.utilisateur.upsert({
    where:  { cjsUid: p.cjs_uid },
    update: {
      nom:       p.data.last_name  ?? undefined,
      prenom:    p.data.first_name ?? undefined,
      email:     p.data.email      ?? undefined,
      telephone: p.data.phone      ?? undefined,
      region:    (p.data.region as Region) ?? undefined,
      statut:    StatutCompte.actif,
      updatedAt: new Date(),
    },
    create: {
      cjsUid:    p.cjs_uid,
      nom:       p.data.last_name  ?? '',
      prenom:    p.data.first_name ?? '',
      email:     p.data.email      ?? undefined,
      telephone: p.data.phone      ?? undefined,
      region:    (p.data.region as Region) ?? undefined,
      statut:    StatutCompte.actif,
    },
  })
}

async function handleUpdated(p: Payload): Promise<void> {
  await prisma.utilisateur.upsert({
    where:  { cjsUid: p.cjs_uid },
    update: {
      nom:       p.data.last_name  ?? undefined,
      prenom:    p.data.first_name ?? undefined,
      email:     p.data.email      ?? undefined,
      telephone: p.data.phone      ?? undefined,
      region:    (p.data.region as Region) ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      cjsUid:    p.cjs_uid,
      nom:       p.data.last_name  ?? '',
      prenom:    p.data.first_name ?? '',
      email:     p.data.email      ?? undefined,
      telephone: p.data.phone      ?? undefined,
      region:    (p.data.region as Region) ?? undefined,
    },
  })
}

async function handleAnonymized(p: Payload): Promise<void> {
  // RGPD : effacer toutes les PII, conserver cjsUid pour cohérence référentielle
  await prisma.utilisateur.update({
    where: { cjsUid: p.cjs_uid },
    data: {
      nom:          'Utilisateur',
      prenom:       'Anonymisé',
      email:        null,
      telephone:    null,
      region:       null,
      commune:      null,
      genre:        null,
      dateNaissance: null,
      statut:       StatutCompte.anonymise,
      deletedAt:    new Date(),
      updatedAt:    new Date(),
    },
  })
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const timestamp = request.headers.get('x-cjs-timestamp') ?? ''
  const signature = request.headers.get('x-cjs-signature') ?? ''
  const body      = await request.text()

  if (!verifySignature(timestamp, signature, body)) {
    logger.warn('webhook-sso: signature invalide', { timestamp })
    return NextResponse.json<ApiResponse>(
      { error: { code: 'UNAUTHORIZED', message: 'Signature invalide' } },
      { status: 401 }
    )
  }

  let parsed: z.infer<typeof payloadSchema>
  try {
    parsed = payloadSchema.parse(JSON.parse(body))
  } catch (err) {
    logger.warn('webhook-sso: payload invalide', { error: String(err) })
    return NextResponse.json<ApiResponse>(
      { error: { code: 'BAD_REQUEST', message: 'Payload invalide' } },
      { status: 400 }
    )
  }

  const { event, cjs_uid, timestamp: payloadTs } = parsed

  if (await isAlreadyProcessed(event, cjs_uid, payloadTs)) {
    logger.info('webhook-sso: doublon ignoré', { event, cjs_uid })
    return NextResponse.json<ApiResponse>({ data: { status: 'duplicate' } })
  }

  try {
    if (event === 'user.provisioned') await handleProvisioned(parsed)
    else if (event === 'user.updated')     await handleUpdated(parsed)
    else if (event === 'user.anonymized')  await handleAnonymized(parsed)

    logger.info('webhook-sso: traité', { event, cjs_uid })
    return NextResponse.json<ApiResponse>({ data: { status: 'ok' } })
  } catch (err) {
    logger.error('webhook-sso: erreur traitement', { event, cjs_uid, error: String(err) })
    // 500 → le SSO retentera (3 essais avec backoff)
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur traitement' } },
      { status: 500 }
    )
  }
}
