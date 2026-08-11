/**
 * GUIC-689 — `POST /api/candidatures/[id]/retrait`
 *
 * ÉTAT : squelette non implémenté (commit RED). Le comportement attendu est
 * décrit par `tests/integration/candidature-retrait.test.ts`.
 */
import { NextRequest, NextResponse } from 'next/server'

import type { ApiResponse } from '@/types/api'

export async function POST(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ statut: string }>>> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Retrait non implémenté' } },
    { status: 501 },
  )
}
