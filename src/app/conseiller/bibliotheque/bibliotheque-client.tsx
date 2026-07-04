'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { confirmerRetrait, enregistrerRetour } from './actions'
import type { EmpruntConseillerItem } from '@/lib/loaders/conseiller-bibliotheque'

type Tab = 'confirmer' | 'rendre' | 'historique'

function Row({ e, tab }: { e: EmpruntConseillerItem; tab: Tab }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const act = (fn: (id: string) => Promise<{ error?: { message: string } }>) => {
    setError(null)
    start(async () => {
      const res = await fn(e.id)
      if (res.error) setError(res.error.message)
      else router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-space-3 px-space-4 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
      <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 40, height: 40, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
        <Icon name="learning" size={19} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-space-2">
          <span className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13.5 }}>{e.livreTitre}</span>
          {e.enRetard && <span className="font-extrabold shrink-0" style={{ fontSize: 9.5, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)', padding: '1px 7px', borderRadius: 999 }}>En retard</span>}
        </div>
        <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>
          {e.emprunteur} · {e.livreAuteur} · {e.codeBarre}
          {tab === 'rendre' && e.retourLabel ? ` · retour prévu ${e.retourLabel}` : ''}
          {tab === 'confirmer' ? ` · demandé ${e.dateLabel}` : ''}
        </div>
        {error && <div className="text-fs-100" style={{ color: 'var(--gj-red)', marginTop: 2 }}>{error}</div>}
      </div>
      {tab === 'confirmer' && (
        <button type="button" onClick={() => act(confirmerRetrait)} disabled={pending} className="inline-flex items-center gap-space-1 font-extrabold shrink-0 disabled:opacity-50" style={{ background: 'var(--gj-green)', color: '#fff', border: 0, padding: '8px 14px', borderRadius: 9, fontSize: 12.5 }}>
          <Icon name="check" size={14} /> Confirmer
        </button>
      )}
      {tab === 'rendre' && (
        <button type="button" onClick={() => act(enregistrerRetour)} disabled={pending} className="inline-flex items-center gap-space-1 font-extrabold shrink-0 disabled:opacity-50" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '8px 14px', borderRadius: 9, fontSize: 12.5 }}>
          <Icon name="check-circle" size={14} /> Retour
        </button>
      )}
    </div>
  )
}

const EMPTY: Record<Tab, string> = {
  confirmer: 'Aucun retrait à confirmer.',
  rendre: 'Aucun emprunt en cours.',
  historique: 'Aucun emprunt rendu.',
}

export function BibliothequeEmprunts({ items, tab }: { items: EmpruntConseillerItem[]; tab: Tab }) {
  if (items.length === 0) {
    return <EmptyState icon="learning" title="Rien ici" description={EMPTY[tab]} />
  }
  return (
    <div className="bg-white rounded-gj-lg overflow-hidden" style={{ border: '1.5px solid var(--gj-line)' }}>
      {items.map((e) => <Row key={e.id} e={e} tab={tab} />)}
    </div>
  )
}
