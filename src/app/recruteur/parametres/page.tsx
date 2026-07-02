import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ComingSoon } from '../ComingSoon'

export const metadata: Metadata = { title: 'Paramètres — Espace Recruteur' }

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')
  return (
    <ComingSoon
      icon="settings"
      titre="Paramètres"
      message="La configuration du compte recruteur sera disponible prochainement."
    />
  )
}
