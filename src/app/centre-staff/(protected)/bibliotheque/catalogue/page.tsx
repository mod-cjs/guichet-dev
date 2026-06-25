/**
 * GUIC-344 — Gestion du catalogue bibliothèque (CRUD livres + exemplaires).
 */

import Link from 'next/link'
import { getStaffSession } from '@/lib/auth/staff-session'
import { getCatalogueCentre } from '@/lib/bibliotheque/service'
import { Card, Icon } from '@/components/ui'
import { CatalogueClient } from './catalogue-client'

export const dynamic = 'force-dynamic'

export default async function BibliothequeStaffCataloguePage() {
  const session = await getStaffSession()
  if (!session) return null

  const livres = await getCatalogueCentre(session.centreId)

  return (
    <section className="flex flex-col gap-space-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3">
        <div className="flex items-center gap-space-3">
          <Link
            href="/centre-staff/bibliotheque"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gj-bg transition-colors"
            aria-label="Retour au tableau de bord bibliothèque"
          >
            <Icon name="chevron-left" size={20} style={{ color: 'var(--gj-teal-deep)' }} />
          </Link>
          <div>
            <h1 className="text-fs-600 font-bold text-color-text-primary">Catalogue</h1>
            <p className="text-fs-300 text-color-text-secondary">
              {livres.length} livre{livres.length !== 1 ? 's' : ''} dans ton centre
            </p>
          </div>
        </div>
      </header>

      <Card variant="default">
        <div className="flex items-start gap-space-3">
          <Icon name="info" size={18} style={{ color: 'var(--gj-teal-deep)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-fs-200 text-color-text-secondary">
            Les livres créés ici sont ajoutés au catalogue global. Les exemplaires sont liés à ton centre.
          </p>
        </div>
      </Card>

      <CatalogueClient centreId={session.centreId} livres={livres} />
    </section>
  )
}
