import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConversation } from '@/lib/loaders/messagerie'
import { marquerConversationLue } from '@/lib/messagerie/actions'
import { MessageList } from '@/components/messagerie/views'
import { Composer } from '@/components/messagerie/Composer'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = { title: 'Conversation — Espace Recruteur' }

const BLUE = 'var(--gj-blue, #1A4ED8)'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const { id } = await params
  const conv = await getConversation(session.cjsUid, id)
  if (!conv) notFound()
  await marquerConversationLue(id)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <Link href="/recruteur/messagerie" className="inline-flex items-center gap-[6px] text-[12.5px] font-bold no-underline mb-[10px]" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>
        <Icon name="chevron-left" size={14} /> Messagerie
      </Link>
      <div className="rounded-[14px] p-[14px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <h1 className="text-[17px] font-black" style={{ color: 'var(--gj-ink)' }}>{conv.interlocuteurNom}</h1>
        <p className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>À propos de « {conv.offreTitre} »</p>
      </div>
      <div className="mb-4">
        <MessageList conversation={conv} accent={BLUE} />
      </div>
      <Composer conversationId={id} accent={BLUE} />
    </div>
  )
}
