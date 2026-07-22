import { NextRequest, NextResponse } from 'next/server'
import { runNotificationReminders } from '@/lib/notifications/reminders'
import type { ApiResponse } from '@/types/api'

// GUIC-547 — Rappels planifiés du centre de notifications (réservations / entretiens /
// événements J-1, emprunts en retard). Non public : authentifié par CRON_SECRET
// (header Authorization: Bearer). À déclencher quotidiennement, idéalement le matin.
// L'idempotence Redis d'emitEvent rend la route re-jouable sans doublon.

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

  const summary = await runNotificationReminders()
  return NextResponse.json({ data: summary })
}
