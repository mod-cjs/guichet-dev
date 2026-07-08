import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { getInbox } from '@/lib/loaders/messagerie'
import { InboxList } from '@/components/messagerie/views'

export const metadata: Metadata = { title: 'Messagerie — Espace conseiller' }
export const dynamic = 'force-dynamic'

const TEAL = 'var(--gj-teal-deep)'

export default async function ConseillerMessageriePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  const items = await getInbox(session.cjsUid)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="mb-space-5">
        <h1 className="font-black" style={{ color: 'var(--gj-ink)', fontSize: 24 }}>Messagerie</h1>
        <p style={{ color: 'var(--gj-grey)', fontSize: 13, marginTop: 3 }}>{items.length} conversation{items.length > 1 ? 's' : ''}</p>
      </div>
      <InboxList items={items} basePath="/conseiller/messagerie" accent={TEAL} />
    </div>
  )
}
