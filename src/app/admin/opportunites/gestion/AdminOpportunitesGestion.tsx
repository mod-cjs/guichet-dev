'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { StatutOpportunite } from '@prisma/client'
import { archiverOpportunite, supprimerOpportunite } from '../actions'

export interface GestionItem {
  id: string
  titre: string
  statut: StatutOpportunite
  typeLabel: string
  organisation: string
}

export interface AdminOpportunitesGestionProps {
  items: GestionItem[]
  total: number
  currentPage?: number
  totalPages?: number
  /** Filtre statut actif (`tous` = pas de filtre). */
  statutFilter?: StatutOpportunite | 'tous'
}

const STATUT_STYLE: Record<StatutOpportunite, { bg: string; ink: string; label: string }> = {
  brouillon: { bg: 'var(--gj-blue-soft)', ink: 'var(--gj-blue-ink)', label: 'Brouillon' },
  publiee: { bg: 'var(--gj-green-soft, #e6f6ec)', ink: 'var(--gj-green-ink, #1a7a3d)', label: 'Publiée' },
  archivee: { bg: 'var(--gj-line)', ink: 'var(--gj-grey)', label: 'Archivée' },
  expiree: { bg: 'var(--gj-red-soft, #fdecec)', ink: 'var(--gj-red-ink)', label: 'Expirée' },
}

const FILTERS: { value: StatutOpportunite | 'tous'; label: string }[] = [
  { value: 'tous', label: 'Toutes' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'publiee', label: 'Publiées' },
  { value: 'archivee', label: 'Archivées' },
]

function StatutBadge({ statut }: { statut: StatutOpportunite }) {
  const s = STATUT_STYLE[statut]
  return (
    <span
      className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide"
      style={{ background: s.bg, color: s.ink }}
    >
      {s.label}
    </span>
  )
}

function Row({ item, onResult }: { item: GestionItem; onResult: (m: string, v: ToastVariant) => void }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<unknown>, ok: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    startTransition(async () => {
      try {
        await fn()
        onResult(ok, 'success')
        router.refresh()
      } catch {
        onResult('Action impossible — réessaie.', 'danger')
      }
    })
  }

  return (
    <div
      className="rounded-[14px] p-[16px] flex items-start gap-[12px] flex-wrap"
      style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}
    >
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <StatutBadge statut={item.statut} />
          <span
            className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide"
            style={{ background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}
          >
            {item.typeLabel}
          </span>
          <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>
            {item.titre}
          </span>
        </div>
        <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
          Par {item.organisation}
        </p>
      </div>

      <div className="flex items-center gap-[8px] flex-wrap">
        <Link
          href={`/admin/opportunites/${item.id}/modifier`}
          className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px]"
          style={{ background: 'var(--gj-surface)', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}
        >
          <Icon name="settings" size={14} />
          Éditer
        </Link>
        {item.statut !== 'archivee' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => archiverOpportunite(item.id), `« ${item.titre} » archivée.`, `Archiver « ${item.titre} » ?`)}
            className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60"
            style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}
          >
            <Icon name="block" size={14} />
            Archiver
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => supprimerOpportunite(item.id), `« ${item.titre} » supprimée.`, `Supprimer « ${item.titre} » ? (réversible côté base, masquée du catalogue)`)}
          className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60"
          style={{ background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' }}
        >
          <Icon name="close" size={14} />
          Supprimer
        </button>
      </div>
    </div>
  )
}

/**
 * AdminOpportunitesGestion (GUIC-28) — liste de gestion tous statuts.
 * Actions : Éditer (formulaire), Archiver, Supprimer (soft-delete). CTA création.
 */
export function AdminOpportunitesGestion({
  items,
  total,
  currentPage = 1,
  totalPages = 1,
  statutFilter = 'tous',
}: AdminOpportunitesGestionProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>
              Gestion des opportunités
            </h1>
            <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
              {total} opportunité{total > 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/admin/opportunites/nouveau"
            className="inline-flex items-center justify-center gap-[6px] font-black text-[13px] rounded-[10px] px-[16px] py-[10px] min-h-[44px]"
            style={{ background: 'var(--gj-teal)', color: '#fff' }}
          >
            <Icon name="plus" size={15} />
            Nouvelle opportunité
          </Link>
        </div>

        <div className="flex items-center gap-[6px] flex-wrap mb-4" role="tablist" aria-label="Filtrer par statut">
          {FILTERS.map((f) => {
            const active = f.value === statutFilter
            const href = f.value === 'tous' ? '/admin/opportunites/gestion' : `/admin/opportunites/gestion?statut=${f.value}`
            return (
              <Link
                key={f.value}
                href={href}
                role="tab"
                aria-selected={active}
                className="text-[12.5px] font-bold rounded-full px-[14px] py-[6px]"
                style={{
                  background: active ? 'var(--gj-teal)' : 'var(--gj-surface)',
                  color: active ? '#fff' : 'var(--gj-grey)',
                  border: `1.5px solid ${active ? 'var(--gj-teal)' : 'var(--gj-line)'}`,
                }}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        {items.length === 0 ? (
          <div
            className="rounded-[14px] p-[32px] text-center"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}
          >
            <p className="text-[14px] font-bold">Aucune opportunité pour ce filtre.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {items.map((item) => (
              <Row key={item.id} item={item} onResult={(m, v) => setFeedback({ message: m, variant: v })} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl={statutFilter === 'tous' ? '/admin/opportunites/gestion' : `/admin/opportunites/gestion?statut=${statutFilter}`}
              ariaLabel="Pagination"
            />
          </div>
        )}
      </div>

      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
