import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { Icon } from '@/components/ui/Icon'
import { PublicationForm } from './PublicationForm'

export const dynamic = 'force-dynamic'

/** GUIC-477 — Page dédiée de création d'une publication (éditeur riche). */
export default async function NouvellePublicationPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 820, margin: '0 auto' }}>
      <Link href="/conseiller/publications" className="inline-flex items-center gap-space-1 no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 13 }}>
        <Icon name="chevron-left" size={16} /> Publications
      </Link>
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Nouvelle publication</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          Atelier, formation ou événement pour {ctx.centreNom}.
        </p>
      </div>
      <PublicationForm />
    </div>
  )
}
