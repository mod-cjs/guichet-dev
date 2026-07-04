import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { getCatalogueCentre } from '@/lib/bibliotheque/service'
import { Icon } from '@/components/ui/Icon'
import { CatalogueClient } from './catalogue-client'

export const dynamic = 'force-dynamic'

/** GUIC-522 — Catalogue de la bibliothèque du centre (consultation + disponibilité). */
export default async function CataloguePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const livres = await getCatalogueCentre(ctx.centreId)

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 980, margin: '0 auto' }}>
      <Link href="/conseiller/bibliotheque" className="inline-flex items-center gap-space-1 no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 13 }}>
        <Icon name="chevron-left" size={16} /> Bibliothèque
      </Link>
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Catalogue</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>{livres.length} titre{livres.length > 1 ? 's' : ''} à {ctx.centreNom}.</p>
      </div>
      <CatalogueClient livres={livres} />
    </div>
  )
}
