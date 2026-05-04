import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const PROTECTED: { pattern: RegExp; role: string }[] = [
  { pattern: /^\/jeune\//,     role: 'beneficiaire' },
  { pattern: /^\/recruteur\//, role: 'recruteur'    },
  { pattern: /^\/admin\//,     role: 'admin'        },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const matched = PROTECTED.find(r => r.pattern.test(pathname))
  if (!matched) return NextResponse.next()

  const session = await getSession(request)

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/).*)'],
}
