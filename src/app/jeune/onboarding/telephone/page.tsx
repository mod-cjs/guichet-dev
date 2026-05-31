import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingTelephone } from '../_screens/OnboardingTelephone'

export const metadata = { title: 'Numéro de téléphone — Guichet Jeunesse' }

/**
 * Écran 2/5 — Téléphone + opérateur (info).
 *
 * On NE réimplémente PAS d'OTP — c'est le SSO qui gère le SMS/WhatsApp
 * (cf docs/sso.md, M11 verrouillé). Le bouton CTA redirige vers
 * `/api/auth/login` (flow OIDC) qui demande le téléphone au SSO si absent.
 */
export default async function OnboardingTelephonePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  return <OnboardingTelephone telephone={session.telephone || undefined} />
}
