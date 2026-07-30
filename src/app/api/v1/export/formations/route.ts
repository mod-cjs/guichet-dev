import { NextRequest, NextResponse } from 'next/server'

/**
 * Data Hub — Export formations (M13).
 *
 * Stub en attente du contrat de streams (cf. `.agent_context/specs/M13-etl-meltano.md`
 * §5) : la route répond `data: []` tant que la sélection de colonnes n'est pas déclarée.
 *
 * GARDE DURCIE (GUIC-631) : la forme faible `apiKey !== process.env.X` accorde l'accès
 * quand la variable est ABSENTE et qu'aucun en-tête n'est envoyé (`undefined !== undefined`
 * est faux) — cas déjà vécu sur un environnement où la variable n'avait pas été propagée.
 * On refuse explicitement si elle n'est pas configurée côté serveur.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.DATAHUB_API_KEY || apiKey !== process.env.DATAHUB_API_KEY) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Clé API invalide' } },
      { status: 401 }
    )
  }
  return NextResponse.json({
    data: [],
    meta: { total: 0, generated_at: new Date().toISOString() },
  })
}
