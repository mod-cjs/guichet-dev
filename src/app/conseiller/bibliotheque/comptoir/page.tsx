import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { Icon } from '@/components/ui/Icon'
import { ComptoirClient } from './comptoir-client'

export const dynamic = 'force-dynamic'

/** GUIC-521 — Comptoir bibliothèque : retrait / dépôt / prêt par scan de la carte CJS. */
export default async function ComptoirPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 680, margin: '0 auto' }}>
      <Link href="/conseiller/bibliotheque" className="inline-flex items-center gap-space-1 no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 13 }}>
        <Icon name="chevron-left" size={16} /> Bibliothèque
      </Link>
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Comptoir</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>Retrait, dépôt et prêt de livres — {ctx.centreNom}.</p>
      </div>
      <ComptoirClient />
    </div>
  )
}
