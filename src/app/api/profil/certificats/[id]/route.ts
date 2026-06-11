/**
 * DELETE /api/profil/certificats/[id] — suppression d'un certificat manuel
 * du jeune authentifié (GUIC-365). Les imports Moodle (`moodleCertId` sans
 * préfixe `manual:`) sont rejetés car leur suppression doit se faire côté
 * Moodle ou via le job d'import.
 *
 * PUT /api/profil/certificats/[id] — mise à jour d'un certificat manuel
 * (GUIC-370). Mêmes contraintes : interdit sur imports Moodle.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'
import type { CertificatItem } from '@/types/profil'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000, max: 10, keyPrefix: `cert-del:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<{ ok: true }>>

  const { id } = await params
  const owns = await prisma.certificatMoodle.findFirst({
    where:  { id, profil: { cjsUid: session.cjsUid } },
    select: { id: true, moodleCertId: true },
  })
  if (!owns) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Certificat introuvable' } },
      { status: 404 },
    )
  }

  if (!owns.moodleCertId.startsWith('manual:')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Les certificats Moodle ne peuvent pas être supprimés ici.' } },
      { status: 403 },
    )
  }

  await prisma.certificatMoodle.delete({ where: { id: owns.id } })
  return NextResponse.json({ data: { ok: true } })
}

const CertificatUpdateSchema = z.object({
  formation: z.string().min(2).max(200),
  organisme: z.string().min(2).max(200).optional().nullable(),
  obtenuLe:  z.string().min(8).max(10), // YYYY-MM-DD
})

const SELECT_FIELDS = {
  id: true, formation: true, obtenuLe: true, urlCertificat: true, fichierUrl: true,
} as const

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<CertificatItem>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000, max: 10, keyPrefix: `cert-put:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<CertificatItem>>

  const { id } = await params
  const owns = await prisma.certificatMoodle.findFirst({
    where:  { id, profil: { cjsUid: session.cjsUid } },
    select: { id: true, moodleCertId: true },
  })
  if (!owns) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Certificat introuvable' } },
      { status: 404 },
    )
  }

  if (!owns.moodleCertId.startsWith('manual:')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Les certificats Moodle ne peuvent pas être modifiés ici.' } },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = CertificatUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const obtenuLeDate = new Date(parsed.data.obtenuLe)
  if (Number.isNaN(obtenuLeDate.getTime())) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Date invalide' } },
      { status: 400 },
    )
  }

  const updated = await prisma.certificatMoodle.update({
    where: { id: owns.id },
    data:  {
      formation: parsed.data.formation,
      obtenuLe:  obtenuLeDate,
    },
    select: SELECT_FIELDS,
  })

  const item: CertificatItem = {
    id:            updated.id,
    formation:     updated.formation,
    obtenuLe:      updated.obtenuLe.toISOString().slice(0, 10),
    urlCertificat: updated.urlCertificat,
    fichierUrl:    updated.fichierUrl,
  }

  return NextResponse.json({ data: item })
}
