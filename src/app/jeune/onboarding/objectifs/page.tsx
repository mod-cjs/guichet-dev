import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingObjectifs } from '../_screens/OnboardingObjectifs'
import { OnboardingObjectifsWeb } from '../_screens-web/OnboardingObjectifsWeb'

export const metadata = { title: 'Tes objectifs — Guichet Jeunesse' }

/** Écran 3/5 — Objectifs (mobile + web responsive, GUIC-195). */
export default async function OnboardingObjectifsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  const prenom = session.prenom || undefined
  return (
    <>
      <div className="gj-onboarding-mobile"><OnboardingObjectifs prenom={prenom} /></div>
      <div className="gj-onboarding-web"><OnboardingObjectifsWeb prenom={prenom} /></div>
    </>
  )
}
