import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import { reconstructTranscript } from '@/lib/ia/metrics/transcript'
import type { ApiResponse } from '@/types/api'

// GET /api/admin/yaye/sessions/[sessionId]/apercu (GUIC-259 #13) — aperçu inline : les
// derniers tours d'une session, pour trier une escalade sans quitter la file. Lecture seule,
// garde canManageYaye. Verbatim si dispo (WhatsApp), sinon structurel (web) — hasVerbatimText.

const DERNIERS = 4

interface ApercuTurn {
  index: number
  userText: string | null
  assistantText: string | null
  toolsUsed: string[]
  escalade: boolean
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<ApiResponse<{ hasVerbatimText: boolean; turns: ApercuTurn[] }>>> {
  const session = await getSession()
  if (!session || !canManageYaye(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé au staff (admin, directeur, conseiller)' } },
      { status: 403 },
    )
  }

  const { sessionId } = await params
  const t = await reconstructTranscript(sessionId)
  const turns: ApercuTurn[] = t.turns.slice(-DERNIERS).map((tr) => ({
    index: tr.index,
    userText: tr.userText,
    assistantText: tr.assistantText,
    toolsUsed: tr.toolsUsed,
    escalade: tr.escalade,
  }))
  return NextResponse.json({ data: { hasVerbatimText: t.hasVerbatimText, turns } })
}
