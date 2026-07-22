import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { isConseillerRole } from '@/lib/auth/espace-roles'
import { loadNotificationMatrix, listEnvoisEnAttente, listHistorique } from './actions'
import { AdminNotificationsPanneau } from './AdminNotificationsPanneau'

export const metadata: Metadata = { title: 'Notifications — Admin CJS' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  const adminAccess = Boolean(session && isAdminRole(session.roles))
  // Un conseiller accède à la file de validation (périmètre RH) — décision PO 2026-07-22.
  if (!session || (!adminAccess && !isConseillerRole(session.roles))) redirect('/')

  const [matrix, enAttente, historique] = await Promise.all([
    adminAccess ? loadNotificationMatrix() : Promise.resolve([]),
    listEnvoisEnAttente(),
    adminAccess ? listHistorique(1) : Promise.resolve({ items: [], total: 0, page: 1, totalPages: 1 }),
  ])

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="text-2xl font-black text-gj-ink">Centre de notifications</h1>
        <p className="mt-1 text-[13px] text-gj-grey">
          {adminAccess
            ? 'Configurez les canaux et le mode de déclenchement de chaque événement, validez les envois en attente et consultez l’historique.'
            : 'Validez les notifications RH en attente d’envoi.'}
        </p>
      </header>
      <AdminNotificationsPanneau
        adminAccess={adminAccess}
        matrix={matrix}
        enAttente={enAttente}
        historique={historique}
      />
    </div>
  )
}
