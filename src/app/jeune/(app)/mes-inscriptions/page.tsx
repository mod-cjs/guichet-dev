import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getMesInscriptions } from '@/lib/loaders/evenements'
import { MesInscriptionsClient } from '@/components/evenements/MesInscriptionsClient'

// GUIC-362 — Mes événements (inscriptions à venir / passées).

export const metadata: Metadata = {
  title: 'Mes événements',
  description: 'Tes inscriptions aux événements, rappels et attestations.',
}

export const dynamic = 'force-dynamic'

export default async function MesInscriptionsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion?return=%2Fjeune%2Fmes-inscriptions')

  const { aVenir, passes } = await getMesInscriptions(session.cjsUid)

  return (
    <div>
      <div className="mb-space-4">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes événements</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Tes inscriptions, tes rappels et tes attestations.
        </p>
      </div>
      <MesInscriptionsClient aVenir={aVenir} passes={passes} />
    </div>
  )
}
