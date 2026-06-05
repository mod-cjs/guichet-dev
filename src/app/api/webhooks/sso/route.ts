import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger, hashId } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
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

/**
 * Idempotence anti-replay via Redis SET NX.
 *
 * Fail-CLOSED (GUIC-243) : si Redis est indisponible, on REFUSE le webhook
 * (on retourne `true` comme s'il avait déjà été traité). C'est volontairement
 * conservateur : un replay d'un webhook critique (`user.anonymized`) peut
 * causer une ré-anonymisation accidentelle et irréversible (RGPD/CDP).
 *
 * En cas de Redis-down prolongé, les webhooks seront refusés et le SSO devra
 * les re-tenter (3 essais avec backoff côté Passport) — comportement
 * acceptable pour des events audit/CDP non temps-réel.
 */
async function isAlreadyProcessed(event: string, cjsUid: string, ts: string): Promise<boolean> {
  const key = `guichet:webhook:sso:${event}:${cjsUid}:${ts}`
  try {
    const set = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX')
    return set === null // null = clé existait déjà → doublon
  } catch (err) {
    logger.error('webhook-sso: Redis down → fail-closed (refus webhook)', {
      event,
      cjsUidHash: hashId(cjsUid),
      err: err instanceof Error ? err.message : String(err),
    })
    return true // fail-CLOSED : traiter comme un doublon → on n'exécute pas le handler
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
  // Rate-limit (GUIC-243) : SSO légitime ne dépasse jamais 100 req/min.
  // Protège contre une brute HMAC théorique ou un flood depuis une IP compromise.
  const limited = await rateLimit(request, {
    windowMs:  60_000,
    max:       100,
    keyPrefix: 'webhook-sso',
  })
  if (limited) return limited as NextResponse<ApiResponse>

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

  // GUIC-240 : cjs_uid jamais en clair dans les logs (CDP loi 2008-12)
  const cjsUidHash = hashId(cjs_uid)

  if (await isAlreadyProcessed(event, cjs_uid, payloadTs)) {
    logger.info('webhook-sso: doublon ignoré', { event, cjsUidHash })
    return NextResponse.json<ApiResponse>({ data: { status: 'duplicate' } })
  }

  try {
    if (event === 'user.provisioned') await handleProvisioned(parsed)
    else if (event === 'user.updated')     await handleUpdated(parsed)
    else if (event === 'user.anonymized')  await handleAnonymized(parsed)

    logger.info('webhook-sso: traité', { event, cjsUidHash })
    return NextResponse.json<ApiResponse>({ data: { status: 'ok' } })
  } catch (err) {
    logger.error('webhook-sso: erreur traitement', { event, cjsUidHash, error: String(err) })
    // 500 → le SSO retentera (3 essais avec backoff)
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur traitement' } },
      { status: 500 }
    )
  }
}
