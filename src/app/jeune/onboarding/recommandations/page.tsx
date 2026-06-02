import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingRecommandations } from '../_screens/OnboardingRecommandations'
import { OnboardingRecommandationsWeb } from '../_screens-web/OnboardingRecommandationsWeb'

export const metadata = { title: 'Tes recommandations — Guichet Jeunesse' }

/** Écran 5/5 — Recommandations (mobile + web responsive, GUIC-195). */
export default async function OnboardingRecommandationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  const prenom = session.prenom || undefined
  return (
    <>
      <div className="gj-onboarding-mobile"><OnboardingRecommandations prenom={prenom} /></div>
      <div className="gj-onboarding-web"><OnboardingRecommandationsWeb prenom={prenom} /></div>
    </>
  )
}
