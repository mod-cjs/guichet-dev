import { NextRequest, NextResponse } from 'next/server'
import { drainDlq } from '@/lib/notifications'
import { drainEngineDlq, flushPlanifiees } from '@/lib/notifications/outbox'
import type { ApiResponse } from '@/types/api'

// GUIC-21 / GUIC-83 — Drain de la file morte des notifications, étendu GUIC-547 :
// rejoue aussi la DLQ v2 du moteur multicanal et envoie les notifications différées
// (mode `differe`) arrivées à échéance. Non public : authentifié par CRON_SECRET
// (header Authorization: Bearer). Déclenché par un cron (≈10 min). Lots bornés.

export const maxDuration = 60

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } },
      { status: 401 },
    )
  }

  const legacy = await drainDlq(50)
  const engine = await drainEngineDlq(50)
  const differees = await flushPlanifiees()
  return NextResponse.json({ data: { legacy, engine, differees } })
}
