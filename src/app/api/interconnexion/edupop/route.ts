import { NextRequest, NextResponse } from 'next/server'
import { webhookIgnore } from '@/lib/flags/guard'
import { verifyHmacSignature, extractHmacHeaders } from '@/lib/verify-hmac'

// TODO Sprint 4 — M10 : Interconnexion edupop
export async function POST(request: NextRequest) {
  const { apiKey, timestamp, signature } = extractHmacHeaders(request.headers)
  const body = await request.text()
  if (!verifyHmacSignature(apiKey, timestamp, signature, body)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Signature invalide' } }, { status: 401 })
  }

  // GUIC-706 — interconnexion fermée : accusé de réception sans traitement. Un refus
  // en erreur ferait rejouer le partenaire, et son événement finirait perdu.
  if (await webhookIgnore('m10.interop_edupop')) {
    return NextResponse.json({ data: { ignored: true } })
  }
  const payload = JSON.parse(body)
  console.log('[edupop] Event reçu:', payload.event)
  return NextResponse.json({ data: { status: 'received' } })
}
