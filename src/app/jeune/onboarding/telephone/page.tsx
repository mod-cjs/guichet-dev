import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingTelephone } from '../_screens/OnboardingTelephone'
import { OnboardingTelephoneWeb } from '../_screens-web/OnboardingTelephoneWeb'

export const metadata = { title: 'Numéro de téléphone — Guichet Jeunesse' }

/**
 * Écran 2/5 — Téléphone (mobile + web responsive, GUIC-195).
 *
 * On NE réimplémente PAS d'OTP — c'est le SSO qui gère le SMS/WhatsApp
 * (cf docs/sso.md, M11 verrouillé). Web : split avec liste 4 étapes à gauche.
 */
export default async function OnboardingTelephonePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  const telephone = session.telephone || undefined
  return (
    <>
      <div className="gj-onboarding-mobile"><OnboardingTelephone telephone={telephone} /></div>
      <div className="gj-onboarding-web"><OnboardingTelephoneWeb telephone={telephone} /></div>
    </>
  )
}
