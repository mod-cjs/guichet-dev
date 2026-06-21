import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encodeSession, setSessionCookie } from '@/lib/auth'
import type { CJSSession } from '@/types/user'

/**
 * ⚠️ DEV UNIQUEMENT — pose une session `cjs_session` SANS passer par le SSO,
 * pour tester l'agent Yaye en local. **Renvoie 404 en production.**
 *
 * Usage :
 *   GET /api/dev/login                      → connecte un user par défaut, redirige vers le dashboard
 *   GET /api/dev/login?uid=<cjs_uid>        → connecte cet utilisateur
 *   GET /api/dev/login?to=/jeune/yaye       → redirige ailleurs après login
 */
const DEFAULT_UID = '00116efd-3740-4ad2-9512-7d639df65524'

export async function GET(request: NextRequest) {
  // Autorisé hors production, OU explicitement via ALLOW_DEV_LOGIN=true (container de
  // test local en image prod). En prod réelle, ce flag n'est jamais positionné → 404.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_LOGIN !== 'true') {
    return new NextResponse('Not found', { status: 404 })
  }

  const uid = request.nextUrl.searchParams.get('uid') ?? DEFAULT_UID
  const u = await prisma.utilisateur.findUnique({
    where: { cjsUid: uid },
    select: { cjsUid: true, nom: true, prenom: true, email: true, telephone: true, region: true },
  })
  if (!u) return new NextResponse(`Utilisateur ${uid} introuvable dans la base courante`, { status: 404 })

  const session: CJSSession = {
    cjsUid: u.cjsUid,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    telephone: u.telephone,
    region: u.region ?? null,
    roles: ['beneficiaire'],
    onboardingComplete: true, // évite la redirection onboarding en test
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    accessToken: '',
    refreshToken: '',
  }

  const encoded = await encodeSession(session)
  const to = request.nextUrl.searchParams.get('to') ?? '/jeune/tableau-de-bord'
  // En container, HOSTNAME=0.0.0.0 → request.url pointe sur 0.0.0.0, host différent de
  // celui tapé (localhost). Le cookie `Secure` ne serait alors pas renvoyé (0.0.0.0
  // n'est pas un contexte sécurisé) → mur de login. On redirige vers le Host d'origine.
  const host = request.headers.get('host') ?? request.nextUrl.host
  const origin = `${request.nextUrl.protocol}//${host}`
  const res = NextResponse.redirect(new URL(to, origin))
  setSessionCookie(res, encoded, 7 * 24 * 3600)
  return res
}
