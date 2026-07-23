import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendTextMessage } from '@/lib/whatsapp'
import { bindWhatsAppNumber, linkConfirmationMessage } from '@/lib/whatsapp/magic-link'
import { basePublique } from '@/lib/security/base-publique'
import { logger } from '@/lib/logger'

// GUIC-140 — Retour post-SSO du lien magique.
//
// Atterrissage après authentification (via cookie `auth_return_to`). On connaît
// désormais le cjs_uid (session) ET le téléphone (cookie posé par /link). On lie
// les deux, on confirme sur WhatsApp, puis on nettoie le cookie.
export async function GET(request: NextRequest) {
  const base = basePublique(request)
  const session = await getSession(request)
  const telephone = request.cookies.get('wa_link_phone')?.value

  if (!session || !telephone) {
    // Session absente (échec SSO) ou cookie expiré → on repart proprement.
    return NextResponse.redirect(new URL('/auth/connexion?error=wa_link_expired', base))
  }

  await bindWhatsAppNumber(telephone, session.cjsUid)

  const response = NextResponse.redirect(new URL('/jeune/tableau-de-bord', base))
  response.cookies.delete('wa_link_phone')

  try {
    await sendTextMessage(telephone, linkConfirmationMessage())
  } catch (err) {
    logger.warn('whatsapp-link-confirm: confirmation non envoyée', { err: String(err) })
  }

  return response
}
