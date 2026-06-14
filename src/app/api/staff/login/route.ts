/**
 * GUIC-387 — POST /api/staff/login (MVP).
 *
 * Auth simplifiée pour le scanner staff Wave 6.2 :
 * - Vérifie l'email contre la whitelist `CONSEILLER_STAFF_EMAILS`
 * - Vérifie l'existence du centre
 * - Pose un cookie httpOnly `centre_staff_session` (JWT 12h)
 *
 * NB : pas de mot de passe vérifié côté MVP — la whitelist email + cookie
 * signé suffisent (à remplacer par SSO conseiller Sprint+1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import {
  clearStaffSession,
  isAllowedStaffEmail,
  setStaffSessionCookie,
} from '@/lib/auth/staff-session'
import type { ApiResponse } from '@/types/api'

const LoginSchema = z.object({
  email:    z.string().email().max(255),
  centreId: z.string().min(1).max(36),
  // accepté mais non vérifié en MVP — placeholder UX
  password: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, {
    windowMs:  60_000,
    max:       10,
    keyPrefix: 'staff-login',
  })
  if (rl) return rl

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INVALID_JSON', message: 'JSON invalide' } },
      { status: 400 },
    )
  }

  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INVALID_INPUT', message: 'Données invalides' } },
      { status: 400 },
    )
  }

  const email = parsed.data.email.trim().toLowerCase()
  const centreId = parsed.data.centreId

  if (!isAllowedStaffEmail(email)) {
    logger.warn('[staff-login] email non autorisé', { email })
    return NextResponse.json<ApiResponse>(
      { error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides' } },
      { status: 401 },
    )
  }

  const centre = await prisma.centre.findUnique({ where: { id: centreId }, select: { id: true } })
  if (!centre) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'CENTRE_NOT_FOUND', message: 'Centre introuvable' } },
      { status: 404 },
    )
  }

  await setStaffSessionCookie({ email, centreId })

  return NextResponse.json<ApiResponse<{ email: string; centreId: string }>>({
    data: { email, centreId },
  })
}

export async function DELETE() {
  await clearStaffSession()
  return NextResponse.json<ApiResponse<{ ok: true }>>({ data: { ok: true } })
}
