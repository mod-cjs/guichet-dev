import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingWelcome } from './_screens/OnboardingWelcome'
import { OnboardingWelcomeWeb } from './_screens-web/OnboardingWelcomeWeb'

export const metadata = { title: 'Bienvenue — Guichet Jeunesse' }

/**
 * Écran 1/5 — Welcome (étape "0", pas de StepBar).
 *
 * Mobile (<1024px) : hero vertical PhoneFrame, stats, photo testimonial.
 * Web    (≥1024px) : split hero desktop avec stack visuel (cf GUIC-195).
 *
 * Le switch est purement CSS (cf `.gj-onboarding-mobile/-web` dans
 * `globals.css`) — pas de hook `useMediaQuery`, pas de flash au 1er paint.
 *
 * Si l'utilisateur a déjà terminé son onboarding → redirect dashboard.
 */
export default async function OnboardingWelcomePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  const prenom = session.prenom || undefined
  return (
    <>
      <div className="gj-onboarding-mobile"><OnboardingWelcome prenom={prenom} /></div>
      <div className="gj-onboarding-web"><OnboardingWelcomeWeb prenom={prenom} /></div>
    </>
  )
}
