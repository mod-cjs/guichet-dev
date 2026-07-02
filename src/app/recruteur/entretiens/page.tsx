import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ComingSoon } from '../ComingSoon'

export const metadata: Metadata = { title: 'Entretiens — Espace Recruteur' }

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')
  return (
    <ComingSoon
      icon="calendar"
      titre="Entretiens"
      message="La planification et le suivi des entretiens avec les candidats arriveront dans une prochaine mise à jour."
    />
  )
}
