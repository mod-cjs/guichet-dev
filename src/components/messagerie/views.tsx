/**
 * GUIC-133 — Vues présentationnelles de la messagerie (partagées recruteur/jeune).
 * Server components purs : les couleurs d'accent sont injectées par l'espace appelant.
 */
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { InboxItem, ConversationDetail } from '@/lib/loaders/messagerie'

function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
function frDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Boîte de réception. `basePath` = `/recruteur/messagerie` ou `/jeune/messagerie`. */
export function InboxList({ items, basePath, accent }: { items: InboxItem[]; basePath: string; accent: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
        <p className="text-[14px] font-bold">Aucune conversation.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-[10px]">
      {items.map((c) => (
        <Link key={c.id} href={`${basePath}/${c.id}`} className="rounded-[14px] p-[14px] flex items-center gap-3 no-underline" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{initials(c.interlocuteurNom)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[14px] truncate ${c.nonLus > 0 ? 'font-black' : 'font-bold'}`} style={{ color: 'var(--gj-ink)' }}>{c.interlocuteurNom}</span>
              {c.dernierAt && <span className="text-[10.5px] shrink-0" style={{ color: 'var(--gj-grey)' }}>{frDate(c.dernierAt)}</span>}
            </div>
            <div className="text-[11.5px] truncate" style={{ color: 'var(--gj-grey)' }}>{c.offreTitre}</div>
            {c.dernierMessage && <div className={`text-[12.5px] truncate mt-[1px] ${c.nonLus > 0 ? 'font-bold' : ''}`} style={{ color: c.nonLus > 0 ? 'var(--gj-ink)' : 'var(--gj-grey)' }}>{c.dernierMessage}</div>}
          </div>
          {c.nonLus > 0 && <span className="shrink-0 rounded-full text-[10px] font-black px-[7px] py-[2px]" style={{ background: accent, color: '#fff' }}>{c.nonLus}</span>}
          <Icon name="chevron-right" size={16} />
        </Link>
      ))}
    </div>
  )
}

/** Fil de messages (bulles). */
export function MessageList({ conversation, accent }: { conversation: ConversationDetail; accent: string }) {
  if (conversation.messages.length === 0) {
    return <p className="text-[13px] text-center py-[24px]" style={{ color: 'var(--gj-grey)' }}>Aucun message. Écrivez le premier.</p>
  }
  return (
    <div className="flex flex-col gap-[8px]">
      {conversation.messages.map((m) => (
        <div
          key={m.id}
          className={`max-w-[80%] rounded-[12px] px-[12px] py-[8px] ${m.deMoi ? 'self-end' : 'self-start'}`}
          style={m.deMoi ? { background: accent, color: '#fff' } : { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
        >
          <div className="text-[13.5px] whitespace-pre-line">{m.corps}</div>
          <div className="text-[10px] mt-[2px]" style={{ opacity: 0.7 }}>{frDateTime(m.createdAt)}</div>
        </div>
      ))}
    </div>
  )
}
