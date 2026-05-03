import { NextRequest, NextResponse } from 'next/server'

// Sprint 4 — M13 : Export opportunites
// À implémenter une fois le modèle de données confirmé

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  if (apiKey !== process.env.DATAHUB_API_KEY) {
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
