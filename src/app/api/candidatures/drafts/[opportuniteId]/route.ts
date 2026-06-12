/**
 * /api/candidatures/drafts/[opportuniteId] — GUIC-382 V2.
 *
 *   GET    → charge le brouillon courant du jeune pour cette opportunité.
 *   PUT    → upsert (auto-save côté client, debounce 2 s).
 *   DELETE → purge (« repartir de zéro » ou après soumission).
 *
 * Auth : SSO obligatoire (cjsUid lu via getSession).
 * Rate-limit : 60/min/cjsUid (auto-save fréquent toléré).
 * TTL : 30 jours — nettoyage par cron (non couvert ici).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

const PutBody = z.object({
  lettre: z.string().max(8000).optional().nullable(),
  cvUrl: z.string().max(500).optional().nullable(),
  consent: z.boolean().optional(),
  cvMode: z.enum(['upload', 'profile']).optional(),
})

interface DraftResponse {
  lettre: string | null
  cvUrl: string | null
  consent: boolean
  cvMode: string
  updatedAt: string
}

async function ensureContext(
  request: NextRequest,
  opportuniteId: string,
): Promise<
  | { ok: true; cjsUid: string }
  | { ok: false; response: NextResponse<ApiResponse<never>> }
> {
  const session = await getSession(request)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
        { status: 401 },
      ),
    }
  }
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: `cand-draft:${session.cjsUid}`,
  })
  if (limited) return { ok: false, response: limited as NextResponse<ApiResponse<never>> }
  if (!opportuniteId || opportuniteId.length > 36) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'opportuniteId invalide' } },
        { status: 400 },
      ),
    }
  }
  return { ok: true, cjsUid: session.cjsUid }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ opportuniteId: string }> },
): Promise<NextResponse<ApiResponse<DraftResponse | null>>> {
  const { opportuniteId } = await params
  const ctx = await ensureContext(request, opportuniteId)
  if (!ctx.ok) return ctx.response
  const draft = await prisma.candidatureDraft.findUnique({
    where: { cjsUid_opportuniteId: { cjsUid: ctx.cjsUid, opportuniteId } },
  })
  if (!draft) return NextResponse.json({ data: null })
  return NextResponse.json({
    data: {
      lettre: draft.lettre,
      cvUrl: draft.cvUrl,
      consent: draft.consent,
      cvMode: draft.cvMode,
      updatedAt: draft.updatedAt.toISOString(),
    },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ opportuniteId: string }> },
): Promise<NextResponse<ApiResponse<DraftResponse>>> {
  const { opportuniteId } = await params
  const ctx = await ensureContext(request, opportuniteId)
  if (!ctx.ok) return ctx.response
  const body = await request.json().catch(() => null)
  const parsed = PutBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Payload invalide' } },
      { status: 400 },
    )
  }
  // Vérif que l'opportunité existe (FK silencieux est moche).
  const oppExists = await prisma.opportunite.findUnique({
    where: { id: opportuniteId },
    select: { id: true },
  })
  if (!oppExists) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Opportunité introuvable' } },
      { status: 404 },
    )
  }
  const draft = await prisma.candidatureDraft.upsert({
    where: { cjsUid_opportuniteId: { cjsUid: ctx.cjsUid, opportuniteId } },
    create: {
      cjsUid: ctx.cjsUid,
      opportuniteId,
      lettre: parsed.data.lettre ?? null,
      cvUrl: parsed.data.cvUrl ?? null,
      consent: parsed.data.consent ?? false,
      cvMode: parsed.data.cvMode ?? 'upload',
    },
    update: {
      lettre: parsed.data.lettre ?? null,
      cvUrl: parsed.data.cvUrl ?? null,
      consent: parsed.data.consent ?? false,
      cvMode: parsed.data.cvMode ?? 'upload',
    },
  })
  return NextResponse.json({
    data: {
      lettre: draft.lettre,
      cvUrl: draft.cvUrl,
      consent: draft.consent,
      cvMode: draft.cvMode,
      updatedAt: draft.updatedAt.toISOString(),
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ opportuniteId: string }> },
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  const { opportuniteId } = await params
  const ctx = await ensureContext(request, opportuniteId)
  if (!ctx.ok) return ctx.response
  await prisma.candidatureDraft
    .delete({
      where: { cjsUid_opportuniteId: { cjsUid: ctx.cjsUid, opportuniteId } },
    })
    .catch(() => null)
  return NextResponse.json({ data: { deleted: true } })
}
