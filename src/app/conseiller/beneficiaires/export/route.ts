import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getConseillerContext, getCentreBeneficiaires, type BenefStatutFilter } from '@/lib/loaders/conseiller'

export const dynamic = 'force-dynamic'

/**
 * GUIC-499 — Export CSV de l'annuaire des bénéficiaires du centre (respecte les
 * filtres recherche + statut). Scopé au centre du conseiller.
 */
function parseStatut(v: string | null): BenefStatutFilter {
  return v === 'actif' || v === 'incomplet' ? v : 'tous'
}
function csvCell(v: string | number | null): string {
  const s = v == null ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return new NextResponse('Non authentifié', { status: 401 })
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return new NextResponse('Accès conseiller requis', { status: 403 })

  const q = request.nextUrl.searchParams.get('q')?.trim() || undefined
  const statut = parseStatut(request.nextUrl.searchParams.get('statut'))
  const { items } = await getCentreBeneficiaires(ctx.centreId, q, statut, 1000)

  const headers = ['Nom', 'Commune', 'Âge', "Niveau d'étude", 'Candidatures', 'Complétion (%)', 'Statut', 'Dernière visite', 'Téléphone']
  const rows = items.map((b) => [
    b.name, b.commune, b.age ?? '', b.niveau ?? '', b.candidatures, b.completion, b.statutLabel, b.lastVisitLabel, b.tel ?? '',
  ])
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
  // BOM UTF-8 pour Excel + accents corrects.
  const body = '﻿' + csv

  const stamp = ctx.centreNom.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="beneficiaires-${stamp}.csv"`,
    },
  })
}
