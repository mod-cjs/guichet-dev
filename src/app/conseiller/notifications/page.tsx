import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { loadNotifications } from '@/lib/loaders/notifications'
import { NotificationsClient } from '@/components/jeune/NotificationsClient'

export const metadata: Metadata = { title: 'Notifications — Espace conseiller' }
export const dynamic = 'force-dynamic'

/**
 * GUIC-500 — US-8 · Notifications du conseiller.
 * Réutilise le loader + le client mutualisés (mêmes que jeune/recruteur).
 */
export default async function ConseillerNotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  const { groupes, unreadCount } = await loadNotifications(session.cjsUid)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <header className="mb-space-5">
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Notifications</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          Réservations, messages et mises à jour de votre centre.
        </p>
      </header>
      <NotificationsClient groupes={groupes} initialUnread={unreadCount} />
    </div>
  )
}
