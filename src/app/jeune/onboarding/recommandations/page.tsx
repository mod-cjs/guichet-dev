import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingRecommandations } from '../_screens/OnboardingRecommandations'

export const metadata = { title: 'Tes recommandations — Guichet Jeunesse' }

export default async function OnboardingRecommandationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  return <OnboardingRecommandations prenom={session.prenom || undefined} />
}
