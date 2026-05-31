import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingWelcome } from './_screens/OnboardingWelcome'

export const metadata = { title: 'Bienvenue — Guichet Jeunesse' }

/**
 * Écran 1/5 — Welcome (étape "0", pas de StepBar).
 *
 * Hero gradient teal-deep → ink-teal, stats CJS, photo testimonial,
 * 2 CTAs : "Commencer" (→ /jeune/onboarding/telephone) et
 * "J'ai déjà un compte" (→ /auth/connexion).
 *
 * Si l'utilisateur a déjà terminé son onboarding → redirect dashboard.
 */
export default async function OnboardingWelcomePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  return <OnboardingWelcome prenom={session.prenom || undefined} />
}
