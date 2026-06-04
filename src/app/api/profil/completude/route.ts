/**
 * GUIC-232 — `GET /api/profil/completude`.
 *
 * Retourne l'état de complétude du profil pour l'utilisateur connecté,
 * afin que le client (CandidatureModal notamment) puisse pré-afficher la
 * liste des champs à compléter avant de tenter le `POST /api/candidatures`.
 *
 * Réponse :
 *   { data: { complet: boolean, missing: ChampProfilRequis[] } }
 *
 * Source de vérité partagée avec `POST /api/candidatures` via
 * `src/lib/profil-completude.ts`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { checkProfilCompletude, type CompletudeResult } from '@/lib/profil-completude'
import type { ApiResponse } from '@/types/api'

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CompletudeResult>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: `profil-completude:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<CompletudeResult>>

  const data = await checkProfilCompletude(session.cjsUid, {
    prenom: session.prenom,
    nom: session.nom,
    email: session.email,
    telephone: session.telephone,
    region: session.region,
  })

  // Données personnelles : pas de cache partagé.
  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
