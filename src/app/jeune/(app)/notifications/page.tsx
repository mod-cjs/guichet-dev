import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = { title: 'Notifications' }

// TODO M11 : brancher sur la table `Notification` (Prisma) une fois le modèle
// défini par le module WhatsApp/notifications. À ce jour aucun modèle
// `Notification` n'existe dans `prisma/schema.prisma` — on rend donc un stub
// avec EmptyState pour ne pas casser le lien depuis l'AppTopbar.
export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Notifications
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Retrouvez ici les messages du Guichet, vos rappels et les mises à
          jour de vos candidatures.
        </p>
      </div>

      <EmptyState
        emoji="🔔"
        title="Aucune notification pour le moment"
        description="Vos prochaines notifications apparaîtront ici dès qu'un événement vous concernera."
      />
    </div>
  )
}
