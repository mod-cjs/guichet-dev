'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { validerPublication, refuserPublication } from './actions'

export interface PublicationAValider {
  id: string
  titre: string
  type: string
  dateLabel: string
  lieuLabel: string
}

function Row({ p }: { p: PublicationAValider }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const act = (fn: (id: string) => Promise<{ ok: true }>) => {
    setError(null)
    start(async () => {
      try { await fn(p.id); router.refresh() }
      catch { setError("Action impossible.") }
    })
  }

  return (
    <div className="flex items-center gap-space-3 px-space-4 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
      <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 40, height: 40, background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
        <Icon name="employment" size={19} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 14 }}>{p.titre}</div>
        <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5 }}>{p.type} · {p.dateLabel} · {p.lieuLabel}</div>
        {error && <div className="text-fs-100" style={{ color: 'var(--gj-red)' }}>{error}</div>}
      </div>
      <div className="flex gap-space-2 shrink-0">
        <button type="button" onClick={() => act(validerPublication)} disabled={pending} className="inline-flex items-center gap-space-1 font-extrabold disabled:opacity-50" style={{ background: 'var(--gj-green)', color: '#fff', border: 0, padding: '8px 14px', borderRadius: 9, fontSize: 12.5 }}>
          <Icon name="check" size={14} /> Valider
        </button>
        <button type="button" onClick={() => act(refuserPublication)} disabled={pending} className="inline-flex items-center gap-space-1 font-extrabold disabled:opacity-50" style={{ background: '#fff', color: 'var(--gj-red)', border: '1.5px solid var(--gj-line)', padding: '8px 14px', borderRadius: 9, fontSize: 12.5 }}>
          <Icon name="close" size={14} /> Refuser
        </button>
      </div>
    </div>
  )
}

export function PublicationsAValider({ items }: { items: PublicationAValider[] }) {
  if (items.length === 0) return null
  return (
    <section className="mb-space-5 bg-white rounded-gj-lg overflow-hidden" style={{ border: '1.5px solid var(--gj-yellow)' }}>
      <div className="flex items-center gap-space-2 px-space-4 py-space-3" style={{ background: 'var(--gj-yellow-soft)' }}>
        <Icon name="alert" size={17} style={{ color: 'var(--gj-yellow-ink)' }} />
        <span className="font-black" style={{ fontSize: 14, color: 'var(--gj-yellow-ink)' }}>Publications à valider ({items.length})</span>
      </div>
      {items.map((p) => <Row key={p.id} p={p} />)}
    </section>
  )
}
