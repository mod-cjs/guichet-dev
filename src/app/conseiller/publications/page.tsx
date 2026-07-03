import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

/** GUIC-477 — Rédaction de publications par le conseiller (validation admin). À venir. */
export default async function ConseillerPublicationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  return (
    <div className="flex flex-col gap-space-4">
      <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Publications</h1>
      <EmptyState
        icon="employment"
        title="Bientôt disponible"
        description="La rédaction de publications (opportunités, événements) soumises à validation de l'administrateur arrive prochainement (GUIC-477)."
      />
    </div>
  )
}
