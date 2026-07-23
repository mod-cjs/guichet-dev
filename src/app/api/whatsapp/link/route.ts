import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendTextMessage } from '@/lib/whatsapp'
import {
  consumeLinkToken,
  bindWhatsAppNumber,
  linkConfirmationMessage,
  LINK_TTL_S,
} from '@/lib/whatsapp/magic-link'
import { basePublique } from '@/lib/security/base-publique'
import { logger } from '@/lib/logger'

// GUIC-140 — Entrée du lien magique reçu sur WhatsApp.
//
// 1. Consomme le token → téléphone (usage unique). Invalide/expiré → page d'erreur.
// 2. Si une session SSO existe déjà → binding immédiat + confirmation WhatsApp.
//    (couvre le re-tap après onboarding, où le callback SSO ne rejoue pas returnTo.)
// 3. Sinon → mémorise le téléphone (cookie httpOnly) + returnTo = /confirm, puis
//    redirige vers le login SSO existant. Le binding se fera au retour de callback.
export async function GET(request: NextRequest) {
  const base = basePublique(request)
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const telephone = await consumeLinkToken(token)

  if (!telephone) {
    return NextResponse.redirect(new URL('/auth/connexion?error=wa_link_invalid', base))
  }

  const session = await getSession(request)
  if (session) {
    await bindWhatsAppNumber(telephone, session.cjsUid)
    try {
      await sendTextMessage(telephone, linkConfirmationMessage())
    } catch (err) {
      logger.warn('whatsapp-link: confirmation non envoyée', { err: String(err) })
    }
    return NextResponse.redirect(new URL('/jeune/tableau-de-bord', base))
  }

  const secure = process.env.NODE_ENV === 'production'
  const response = NextResponse.redirect(new URL('/api/auth/login', base))
  // Le téléphone doit survivre à l'aller-retour SSO : cookie httpOnly SameSite=Lax.
  response.cookies.set('wa_link_phone', telephone, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: LINK_TTL_S,
    path: '/',
  })
  // Le callback SSO lit `auth_return_to` pour ramener l'utilisateur sur /confirm.
  response.cookies.set('auth_return_to', '/api/whatsapp/link/confirm', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: LINK_TTL_S,
    path: '/',
  })
  return response
}
