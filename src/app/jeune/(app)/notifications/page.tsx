import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadNotifications } from '@/lib/loaders/notifications'
import { NotificationsClient } from '@/components/jeune/NotificationsClient'

// GUIC-247 — Page complète du centre de notifications.
// Remplace l'EmptyState stub (GUIC-233) par la version branchée sur Prisma.

export const metadata: Metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const { groupes, unreadCount } = await loadNotifications(session.cjsUid)

  return (
    <div>
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Notifications
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Retrouvez ici les messages du Guichet, vos rappels et les mises à
          jour de vos candidatures.
        </p>
      </header>

      <NotificationsClient groupes={groupes} initialUnread={unreadCount} />
    </div>
  )
}
