import { NextRequest, NextResponse } from 'next/server'
import { verifyHmacSignature, extractHmacHeaders } from '@/lib/verify-hmac'

// TODO Sprint 4 — M10 : Interconnexion moodle
export async function POST(request: NextRequest) {
  const { apiKey, timestamp, signature } = extractHmacHeaders(request.headers)
  const body = await request.text()
  if (!verifyHmacSignature(apiKey, timestamp, signature, body)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Signature invalide' } }, { status: 401 })
  }
  const payload = JSON.parse(body)
  console.log('[moodle] Event reçu:', payload.event)
  return NextResponse.json({ data: { status: 'received' } })
}
