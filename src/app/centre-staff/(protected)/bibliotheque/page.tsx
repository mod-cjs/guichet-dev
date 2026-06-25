/**
 * GUIC-274/344 — Tableau de bord bibliothèque staff.
 * Affiche les emprunts à confirmer et les emprunts à rendre pour le centre.
 */

import Link from 'next/link'
import { getStaffSession } from '@/lib/auth/staff-session'
import { getEmpruntsCentre } from '@/lib/bibliotheque/service'
import { Card, Icon } from '@/components/ui'
import { BiblioStaffTabs } from './biblio-staff-tabs'

export const dynamic = 'force-dynamic'

export default async function BibliothequeStaffPage() {
  const session = await getStaffSession()
  if (!session) return null

  const [aConfirmer, aRendre] = await Promise.all([
    getEmpruntsCentre(session.centreId, ['initie']),
    getEmpruntsCentre(session.centreId, ['en_cours', 'en_retard']),
  ])

  return (
    <section className="flex flex-col gap-space-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3">
        <div>
          <h1 className="text-fs-600 font-bold text-color-text-primary">Bibliothèque</h1>
          <p className="text-fs-300 text-color-text-secondary">
            Gestion des emprunts du centre
          </p>
        </div>
        <Link
          href="/centre-staff/bibliotheque/catalogue"
          className="inline-flex items-center gap-space-2 min-h-[var(--tap-min)] px-space-4 rounded-gj-md bg-gj-teal text-white font-bold text-fs-300 no-underline"
        >
          <Icon name="resources" size={16} />
          Gérer le catalogue
        </Link>
      </header>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-space-3">
        <Card variant="default">
          <div className="flex items-center gap-space-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--gj-yellow-soft, #fef9c3)' }}
            >
              <Icon name="clock" size={20} style={{ color: 'var(--gj-yellow-ink, #854d0e)' }} />
            </div>
            <div>
              <p className="text-fs-600 font-black text-color-text-primary">{aConfirmer.length}</p>
              <p className="text-fs-200 text-color-text-secondary">À confirmer</p>
            </div>
          </div>
        </Card>
        <Card variant="default">
          <div className="flex items-center gap-space-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--gj-teal-soft)' }}
            >
              <Icon name="resources" size={20} style={{ color: 'var(--gj-teal-deep)' }} />
            </div>
            <div>
              <p className="text-fs-600 font-black text-color-text-primary">{aRendre.length}</p>
              <p className="text-fs-200 text-color-text-secondary">En cours / En retard</p>
            </div>
          </div>
        </Card>
      </div>

      <BiblioStaffTabs
        centreId={session.centreId}
        aConfirmer={aConfirmer}
        aRendre={aRendre}
      />
    </section>
  )
}
