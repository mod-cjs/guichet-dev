import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// Routes protégées par rôle
const PROTECTED = [
  { pattern: /^\/(mon-profil|mes-candidatures|mes-formations)/, role: 'beneficiaire' },
  { pattern: /^\/(tableau-de-bord|mes-offres|candidatures)/, role: 'recruteur' },
  { pattern: /^\/admin/, role: 'admin' },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const matched = PROTECTED.find(r => r.pattern.test(pathname))
  if (!matched) return NextResponse.next()

  const session = await getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/auth/connexion', request.url))
  }

  if (!session.roles.includes(matched.role)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès non autorisé' } },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
