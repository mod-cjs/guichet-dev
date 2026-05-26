import { NextRequest, NextResponse } from 'next/server'
import { drainDlq } from '@/lib/notifications'
import type { ApiResponse } from '@/types/api'

// GUIC-21 / GUIC-83 — Drain de la file morte des notifications.
// Non public : authentifié par CRON_SECRET (header Authorization: Bearer).
// Déclenché par un cron (Vercel `crons` ou crontab système). Lot borné à 50.

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

  const result = await drainDlq(50)
  return NextResponse.json({ data: result })
}
