'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { StatutCompte } from '@prisma/client'
import { basculerStatutRecruteur } from './actions'

export interface RecruteurRow {
  cjsUid: string
  nom: string
  email: string | null
  statut: StatutCompte
  organisationId: string | null
  organisationNom: string | null
  organisationVerifiee: boolean
  offresCount: number
}

export interface AdminRecruteursTableProps {
  items: RecruteurRow[]
  total: number
  currentPage?: number
  totalPages?: number
  search?: string
}

function StatutBadge({ statut }: { statut: StatutCompte }) {
  const map: Record<StatutCompte, { bg: string; fg: string; label: string }> = {
    actif: { bg: 'var(--gj-green-soft, #e6f6ec)', fg: 'var(--gj-green-ink, #1a7a3d)', label: 'Actif' },
    inactif: { bg: 'var(--gj-line)', fg: 'var(--gj-grey)', label: 'Suspendu' },
    anonymise: { bg: 'var(--gj-red-soft, #fdecec)', fg: 'var(--gj-red-ink)', label: 'Anonymisé' },
  }
  const s = map[statut]
  return <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
}

function Row({ item, onResult }: { item: RecruteurRow; onResult: (m: string, v: ToastVariant) => void }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const actif = item.statut === 'actif'
  const anonymise = item.statut === 'anonymise'

  function toggle() {
    if (actif && !window.confirm(`Suspendre le recruteur « ${item.nom} » ?`)) return
    startTransition(async () => {
      try {
        await basculerStatutRecruteur(item.cjsUid, !actif)
        onResult(actif ? `« ${item.nom} » suspendu.` : `« ${item.nom} » réactivé.`, 'success')
        router.refresh()
      } catch {
        onResult('Action impossible.', 'danger')
      }
    })
  }

  return (
    <div className="rounded-[14px] p-[16px] flex items-start gap-[12px] flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>{item.nom}</span>
          <StatutBadge statut={item.statut} />
        </div>
        <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
          {[item.email, item.organisationNom].filter(Boolean).join(' · ') || '—'}
          {' · '}{item.offresCount} offre{item.offresCount > 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex items-center gap-[8px] flex-wrap">
        {item.organisationId && (
          <Link href={`/admin/partenaires/${item.organisationId}`} className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px]" style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>
            <Icon name="engagement" size={14} /> Organisation
          </Link>
        )}
        {!anonymise && (
          <button type="button" disabled={pending} onClick={toggle} className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60" style={actif ? { background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' } : { background: 'var(--gj-green, #2b9e54)', color: '#fff', border: 'none' }}>
            <Icon name={actif ? 'block' : 'check'} size={14} /> {actif ? 'Suspendre' : 'Réactiver'}
          </button>
        )}
      </div>
    </div>
  )
}

/** AdminRecruteursTable (GUIC-511) — comptes recruteurs (personnes). */
export function AdminRecruteursTable({ items, total, currentPage = 1, totalPages = 1, search = '' }: AdminRecruteursTableProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="mb-4">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Recruteurs</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{total} compte{total > 1 ? 's' : ''} recruteur{total > 1 ? 's' : ''}</p>
        </div>

        <form method="GET" className="flex items-center gap-[6px] mb-4">
          <input name="q" defaultValue={search} placeholder="Rechercher un recruteur…" className="rounded-[9px] border-[1.5px] px-[12px] py-[8px] text-[13px] min-w-[220px]" style={{ borderColor: 'var(--gj-line)' }} />
          <button type="submit" className="inline-flex items-center gap-[6px] font-bold text-[13px] rounded-[9px] px-[12px] py-[8px]" style={{ background: 'var(--gj-teal)', color: '#fff' }}>
            <Icon name="search" size={14} />
          </button>
        </form>

        {items.length === 0 ? (
          <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
            <p className="text-[14px] font-bold">Aucun recruteur.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {items.map((item) => <Row key={item.cjsUid} item={item} onResult={(m, v) => setFeedback({ message: m, variant: v })} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl="/admin/recruteurs" ariaLabel="Pagination" />
          </div>
        )}
      </div>

      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
