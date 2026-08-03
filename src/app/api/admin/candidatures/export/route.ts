import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { StatutCandidature, StatutPipeline, Prisma } from '@prisma/client'

const EXPORT_CAP = 5000

const STATUT_LABEL: Record<string, string> = {
  En_attente: 'En attente',
  Vue: 'Vue',
  Retenue: 'Retenue',
  Refusee: 'Refusée',
}
const ETAPE_LABEL: Record<string, string> = { Recue: 'Reçue', Preselection: 'Présélection', Entretien: 'Entretien', Decision: 'Décision' }

/** Échappe une valeur pour une cellule CSV (RFC 4180). */
function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export CSV des candidatures (supervision admin — GUIC-462).
 * Garde de session admin. Respecte les filtres q/statut de la vue.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  // CAND-2 — `statut` validé contre l'enum (un param invalide ferait crasher Prisma → 500).
  const VALID_STATUTS = new Set<StatutCandidature>(['En_attente', 'Vue', 'Retenue', 'Refusee'])
  const rawStatut = searchParams.get('statut') ?? ''
  const statutFilter = VALID_STATUTS.has(rawStatut as StatutCandidature) ? rawStatut : ''
  const VALID_ETAPES = new Set<StatutPipeline>(['Recue', 'Preselection', 'Entretien', 'Decision'])
  const rawEtape = searchParams.get('etape') ?? ''
  const etapeFilter = VALID_ETAPES.has(rawEtape as StatutPipeline) ? rawEtape : ''
  // Sélection groupée : export d'un sous-ensemble d'ids (bulk / fiche).
  const ids = (searchParams.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  const where: Prisma.CandidatureWhereInput = {
    ...(ids.length ? { id: { in: ids } } : {}),
    ...(q
      ? {
          OR: [
            { utilisateur: { nom: { contains: q } } },
            { utilisateur: { prenom: { contains: q } } },
            { opportunite: { titre: { contains: q } } },
            { opportunite: { organisation: { contains: q } } },
          ],
        }
      : {}),
    ...(statutFilter ? { statut: statutFilter as StatutCandidature } : {}),
    ...(etapeFilter ? { pipelineStage: etapeFilter as StatutPipeline } : {}),
  }

  const candidatures = await prisma.candidature.findMany({
    where,
    orderBy: { soumiseA: 'desc' },
    take: EXPORT_CAP,
    select: {
      statut: true,
      soumiseA: true,
      pipelineStage: true,
      scoreAdequation: true,
      cguVersion: true,
      consentAt: true,
      consentIp: true,
      notificationsConsent: true,
      utilisateur: { select: { nom: true, prenom: true, email: true } },
      opportunite: { select: { titre: true, organisation: true, organisationLibelle: true } },
    },
  })

  // Export CDP enrichi : + Étape, Score IA, Consentement (version/date/IP), Notifications.
  const header = ['Candidat', 'Email', 'Opportunité', 'Annonceur', 'Statut', 'Étape', 'Score IA', 'Soumise le', 'CGU version', 'Consenti le', 'IP consentement', 'Notifications']
  const lines = candidatures.map((c) =>
    [
      `${c.utilisateur.prenom} ${c.utilisateur.nom}`,
      c.utilisateur.email ?? '',
      c.opportunite.titre,
      c.opportunite.organisationLibelle ?? c.opportunite.organisation,
      STATUT_LABEL[c.statut] ?? c.statut,
      ETAPE_LABEL[c.pipelineStage] ?? c.pipelineStage,
      c.scoreAdequation == null ? '' : String(c.scoreAdequation),
      c.soumiseA.toISOString().slice(0, 10),
      c.cguVersion ?? '',
      c.consentAt ? c.consentAt.toISOString().slice(0, 10) : '',
      c.consentIp ?? '',
      c.notificationsConsent ? 'Oui' : 'Non',
    ]
      .map(csvCell)
      .join(','),
  )
  const csv = '﻿' + [header.join(','), ...lines].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="candidatures-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
