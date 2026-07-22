import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { loadNotificationMatrix } from './actions'
import { AdminNotificationsMatrix } from './AdminNotificationsMatrix'

export const metadata: Metadata = { title: 'Notifications — Admin CJS' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/')

  const matrix = await loadNotificationMatrix()

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="text-2xl font-black text-gj-ink">Centre de notifications</h1>
        <p className="mt-1 text-[13px] text-gj-grey">
          Pour chaque événement et chaque type d’utilisateur, choisissez les canaux de
          notification. L’in-app est toujours disponible ; WhatsApp, SMS et email respectent le
          consentement de l’utilisateur.
        </p>
      </header>
      <AdminNotificationsMatrix initial={matrix} />
    </div>
  )
}
