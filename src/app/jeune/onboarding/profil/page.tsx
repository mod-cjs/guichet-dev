import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OnboardingProfil } from '../_screens/OnboardingProfil'
import { OnboardingProfilWeb } from '../_screens-web/OnboardingProfilWeb'

export const metadata = { title: 'Ton profil — Guichet Jeunesse' }

/**
 * Écran 4/5 — Profil minimal (prénom, nom, date naissance, genre, région, commune).
 *
 * Pré-remplit avec ce que le SSO a déjà fourni (Utilisateur) + draft client.
 * À la soumission, on appelle les 2 premières étapes de `/api/v1/onboarding`
 * (step 1 identité, step 2 localisation), puis on redirige vers
 * `/jeune/onboarding/recommandations`.
 */
export default async function OnboardingProfilPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  const utilisateur = await prisma.utilisateur.findUnique({
    where:  { cjsUid: session.cjsUid },
    select: {
      nom: true, prenom: true, dateNaissance: true, genre: true,
      region: true, commune: true,
    },
  })

  const initial = {
    prenom:        utilisateur?.prenom ?? '',
    nom:           utilisateur?.nom    ?? '',
    dateNaissance: utilisateur?.dateNaissance?.toISOString().slice(0, 10) ?? '',
    genre:         (utilisateur?.genre as 'M' | 'F' | null) ?? null,
    region:        utilisateur?.region ? String(utilisateur.region) : '',
    commune:       utilisateur?.commune ?? '',
  }

  return (
    <>
      <div className="gj-onboarding-mobile"><OnboardingProfil initial={initial} /></div>
      <div className="gj-onboarding-web"><OnboardingProfilWeb initial={initial} /></div>
    </>
  )
}
