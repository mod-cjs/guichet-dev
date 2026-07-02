import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadNotifications } from '@/lib/loaders/notifications'
import { NotificationsClient } from '@/components/jeune/NotificationsClient'

export const metadata: Metadata = { title: 'Notifications — Espace Recruteur' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const { groupes, unreadCount } = await loadNotifications(session.cjsUid)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <header className="mb-6">
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Notifications</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>Candidatures, messages et mises à jour de vos offres.</p>
      </header>
      <NotificationsClient groupes={groupes} initialUnread={unreadCount} />
    </div>
  )
}
