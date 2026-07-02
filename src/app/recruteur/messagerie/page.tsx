import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ComingSoon } from '../ComingSoon'

export const metadata: Metadata = { title: 'Messagerie — Espace Recruteur' }

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')
  return (
    <ComingSoon
      icon="chat"
      titre="Messagerie"
      message="Les échanges directs avec les candidats seront disponibles prochainement."
    />
  )
}
