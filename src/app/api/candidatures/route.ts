import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'

// Sprint 1 — M3 — Candidatures
// Structure à implémenter une fois le modèle de données confirmé

export async function GET(_request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return NextResponse.json({ data: [], meta: { total: 0 } })
}

export async function POST(_request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'À implémenter' } },
    { status: 501 }
  )
}
