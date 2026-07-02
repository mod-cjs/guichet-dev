import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getInbox } from '@/lib/loaders/messagerie'
import { InboxList } from '@/components/messagerie/views'

export const metadata: Metadata = { title: 'Messagerie' }
export const dynamic = 'force-dynamic'

const TEAL = 'var(--gj-teal-deep, #0F766E)'

export default async function Page() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const items = await getInbox(session.cjsUid)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Messagerie</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>Vos échanges avec les recruteurs</p>
      </div>
      <InboxList items={items} basePath="/jeune/messagerie" accent={TEAL} />
    </div>
  )
}
