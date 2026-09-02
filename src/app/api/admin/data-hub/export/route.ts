import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { DICTIONNAIRE } from '@/lib/datahub/contrat'
import {
  construireCsvDictionnaire,
  filtrerDictionnaire,
  type TierFiltre,
} from '@/lib/datahub/dictionnaire'

/**
 * Data Hub — `GET /api/admin/data-hub/export`
 *
 * Le dictionnaire en fichier. Un analyste veut trier 163 colonnes dans un tableur ou
 * envoyer le contrat à un partenaire ; le lire à l'écran ne lui sert qu'à répondre à une
 * question ponctuelle.
 *
 * L'export REPREND LE FILTRE ACTIF (`q`, `tier`) : on exporte ce qu'on voit. Sans cela, la
 * vue « pseudonyme » — celle qui sert à un examen CDP — perdrait tout son intérêt au
 * moment précis où on veut la transmettre.
 *
 * Aucune donnée personnelle ici : ce sont des métadonnées de schéma, pas des lignes de la
 * base. D'où une garde de session admin, sans journalisation `auditPiiAccess` (contrairement
 * à `/api/admin/export/utilisateurs`, qui sort de vraies personnes).
 */
export const dynamic = 'force-dynamic'

function lireTier(brut: string | null): TierFiltre {
  return brut === 'public' || brut === 'pseudonyme' ? brut : 'tous'
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  const params = request.nextUrl.searchParams
  const flux = filtrerDictionnaire(DICTIONNAIRE, params.get('q') ?? '', lireTier(params.get('tier')))
  const jour = new Date().toISOString().slice(0, 10)

  // Tout format inconnu retombe sur le CSV plutôt que de rendre une erreur : un paramètre
  // mal tapé dans une URL partagée ne doit pas priver l'utilisateur de son export.
  if (params.get('format') === 'json') {
    return new NextResponse(JSON.stringify(flux, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="dictionnaire-data-hub-${jour}.json"`,
      },
    })
  }

  return new NextResponse(construireCsvDictionnaire(flux), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dictionnaire-data-hub-${jour}.csv"`,
    },
  })
}
