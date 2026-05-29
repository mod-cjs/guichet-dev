import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingObjectifs } from '../_screens/OnboardingObjectifs'

export const metadata = { title: 'Tes objectifs — Guichet Jeunesse' }

export default async function OnboardingObjectifsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  return <OnboardingObjectifs prenom={session.prenom || undefined} />
}
