import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

/**
 * `/jeune/onboarding` — entrée du funnel post-SSO.
 *
 * Décision GUIC-199 : on n'affiche plus l'écran "Welcome" ici (il vit
 * désormais sur `/` comme page d'accueil publique). Un user qui arrive sur
 * cette route a déjà une session valide ; on le pousse direct sur l'étape
 * de saisie du téléphone, ou sur son dashboard si l'onboarding est terminé.
 *
 * Note : la PR #84 (GUIC-235 stats homepage) introduit `loadHomeStats()` —
 * les stats sont consommées par WelcomeHero* sur la home publique `/`,
 * plus depuis cette route (Welcome retiré ici).
 */
export default async function OnboardingEntryPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')
  redirect('/jeune/onboarding/telephone')
}
