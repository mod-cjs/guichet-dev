/**
 * API draft d'onboarding (GUIC-181).
 *
 * Remplace l'ancien stockage `sessionStorage` côté client par une table
 * Prisma `OnboardingDraft`. Permet la reprise multi-device et la résilience
 * (cybercafé Sénégal). Le draft est supprimé à la finalisation.
 *
 * - GET    /api/onboarding/draft → 200 { data: Draft | null }
 * - PATCH  /api/onboarding/draft → upsert partiel (merge), 200 { data: Draft }
 * - DELETE /api/onboarding/draft → 204 (idempotent)
 *
 * Auth obligatoire : `getSession()` → 401 sinon.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

// ── Types & schémas ───────────────────────────────────────────────────────

const OBJECTIF_VALUES = ['emploi', 'projet', 'formation', 'agriculture', 'engagement'] as const

const patchSchema = z
  .object({
    objectifs:     z.array(z.enum(OBJECTIF_VALUES)).optional(),
    telephone:     z.string().min(1).max(20).optional().nullable(),
    prenom:        z.string().min(1).max(100).optional().nullable(),
    nom:           z.string().min(1).max(100).optional().nullable(),
    /** Format YYYY-MM-DD attendu, sérialisé côté DB en DateTime UTC à minuit. */
    dateNaissance: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu YYYY-MM-DD')
      .optional()
      .nullable(),
    genre:   z.enum(['M', 'F', 'Autre']).optional().nullable(),
    region:  z.string().min(1).max(50).optional().nullable(),
    commune: z.string().min(1).max(100).optional().nullable(),
  })
  .strict()

export type OnboardingDraftDTO = {
  objectifs:     string[] | null
  telephone:     string | null
  prenom:        string | null
  nom:           string | null
  dateNaissance: string | null
  genre:         string | null
  region:        string | null
  commune:       string | null
  updatedAt:     string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json<ApiResponse>(
    { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
    { status: 401 },
  )
}

function badJson() {
  return NextResponse.json<ApiResponse>(
    { error: { code: 'BAD_REQUEST', message: 'JSON invalide' } },
    { status: 400 },
  )
}

function validationError(message: string) {
  return NextResponse.json<ApiResponse>(
    { error: { code: 'VALIDATION_ERROR', message } },
    { status: 422 },
  )
}

interface DraftRow {
  objectifs:     unknown
  telephone:     string | null
  prenom:        string | null
  nom:           string | null
  dateNaissance: Date | null
  genre:         string | null
  region:        string | null
  commune:       string | null
  updatedAt:     Date
}

function serialize(row: DraftRow): OnboardingDraftDTO {
  return {
    objectifs:     Array.isArray(row.objectifs) ? (row.objectifs as string[]) : null,
    telephone:     row.telephone,
    prenom:        row.prenom,
    nom:           row.nom,
    dateNaissance: row.dateNaissance ? row.dateNaissance.toISOString().slice(0, 10) : null,
    genre:         row.genre,
    region:        row.region,
    commune:       row.commune,
    updatedAt:     row.updatedAt.toISOString(),
  }
}

// ── GET ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: 'onboarding-draft-get' })
  if (limited) return limited

  const session = await getSession(request)
  if (!session) return unauthorized()

  const row = await prisma.onboardingDraft.findUnique({
    where: { cjsUid: session.cjsUid },
  })

  return NextResponse.json<ApiResponse<OnboardingDraftDTO | null>>({
    data: row ? serialize(row) : null,
  })
}

// ── PATCH ─────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: 'onboarding-draft-patch' })
  if (limited) return limited

  const session = await getSession(request)
  if (!session) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badJson()
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? 'Données invalides')
  }

  const input = parsed.data

  // Construire le payload Prisma : on n'inclut que les champs présents.
  // `null` = effacer explicitement ; `undefined` = ne pas toucher.
  const writable: Record<string, unknown> = {}
  if (input.objectifs !== undefined)     writable.objectifs     = input.objectifs
  if (input.telephone !== undefined)     writable.telephone     = input.telephone
  if (input.prenom !== undefined)        writable.prenom        = input.prenom
  if (input.nom !== undefined)           writable.nom           = input.nom
  if (input.dateNaissance !== undefined) writable.dateNaissance = input.dateNaissance ? new Date(input.dateNaissance) : null
  if (input.genre !== undefined)         writable.genre         = input.genre
  if (input.region !== undefined)        writable.region        = input.region
  if (input.commune !== undefined)       writable.commune       = input.commune

  const row = await prisma.onboardingDraft.upsert({
    where:  { cjsUid: session.cjsUid },
    update: writable,
    create: { cjsUid: session.cjsUid, ...writable },
  })

  return NextResponse.json<ApiResponse<OnboardingDraftDTO>>({ data: serialize(row) })
}

// ── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: 'onboarding-draft-delete' })
  if (limited) return limited

  const session = await getSession(request)
  if (!session) return unauthorized()

  try {
    await prisma.onboardingDraft.delete({ where: { cjsUid: session.cjsUid } })
  } catch (err) {
    // P2025 : pas de ligne à supprimer → idempotent
    const code = (err as { code?: string })?.code
    if (code !== 'P2025') throw err
  }

  return new NextResponse(null, { status: 204 })
}
