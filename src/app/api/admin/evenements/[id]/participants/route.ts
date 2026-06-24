import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STATUT_LABEL: Record<string, string> = {
  inscrit: 'Inscrit',
  liste_attente: 'En attente',
  present: 'Présent',
  annule: 'Annulé',
}

function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export CSV des participants d'un événement (supervision admin — GUIC-465).
 * Garde de session admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  const { id } = await params
  const ev = await prisma.evenement.findUnique({
    where: { id },
    select: {
      titre: true,
      inscriptions: {
        select: {
          statut: true,
          inscritA: true,
          utilisateur: { select: { prenom: true, nom: true, email: true } },
        },
        orderBy: { inscritA: 'asc' },
      },
    },
  })

  if (!ev) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Événement introuvable' } },
      { status: 404 },
    )
  }

  const header = ['Participant', 'Email', 'Statut', 'Inscrit le']
  const lines = ev.inscriptions.map((i) =>
    [
      `${i.utilisateur.prenom} ${i.utilisateur.nom}`,
      i.utilisateur.email ?? '',
      STATUT_LABEL[i.statut] ?? i.statut,
      i.inscritA.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(','),
  )
  const csv = '﻿' + [header.join(','), ...lines].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="participants-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
