import { redirect }          from 'next/navigation'
import { getSession }         from '@/lib/auth'
import { prisma }             from '@/lib/prisma'
import { OnboardingWizard }   from '@/components/features/OnboardingWizard'

export const metadata = { title: 'Compléter mon profil — Guichet Jeunesse' }

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  // Charger les données existantes directement en base pour pré-remplissage
  const utilisateur = await prisma.utilisateur.findUnique({
    where:  { cjsUid: session.cjsUid },
    select: {
      nom: true, prenom: true, dateNaissance: true, genre: true,
      region: true, commune: true,
      profil: {
        select: { niveauEtude: true, situationEmploi: true, domainesInteret: true },
      },
    },
  })

  const initialData = utilisateur ? {
    identite: {
      nom:           utilisateur.nom,
      prenom:        utilisateur.prenom,
      dateNaissance: utilisateur.dateNaissance?.toISOString().slice(0, 10) ?? undefined,
      genre:         (utilisateur.genre as 'M' | 'F' | null | undefined) ?? undefined,
    },
    localisation: {
      region:  utilisateur.region ? String(utilisateur.region) : undefined,
      commune: utilisateur.commune ?? undefined,
    },
    profil: {
      niveauEtude:     utilisateur.profil?.niveauEtude     ?? null,
      situationEmploi: utilisateur.profil?.situationEmploi ?? null,
      domainesInteret: (utilisateur.profil?.domainesInteret as string[] | null) ?? [],
    },
  } : undefined

  return <OnboardingWizard initialData={initialData} />
}
