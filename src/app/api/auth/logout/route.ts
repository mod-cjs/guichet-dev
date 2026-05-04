import { NextRequest, NextResponse } from 'next/server'
import { getSession, clearSessionCookie } from '@/lib/auth'
import { revokeToken } from '@/lib/sso-client'

export async function GET(request: NextRequest) {
  const session = await getSession()
  const response = NextResponse.redirect(new URL('/', request.url))

  if (session) {
    try {
      await revokeToken(session.accessToken)
    } catch {
      // révocation SSO échouée — on purge le cookie local quand même
    }
  }

  clearSessionCookie(response)
  return response
}
