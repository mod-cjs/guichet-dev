'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { basculerVerifiePartenaire } from './actions'
import { PartenaireFormModal, type PartenaireValues } from './PartenaireFormModal'
import type { ProgrammeOption } from '@/components/admin/ProgrammesField'

export interface PartenaireRow {
  id: string
  nom: string
  description?: string | null
  logoUrl?: string | null
  secteur: string | null
  region: string | null
  email: string | null
  estVerifie: boolean
  opportunitesCount: number
  /** GUIC-684 — programmes dont ce partenaire relève (préremplissage). */
  programmeSlugs?: string[]
  programmePrincipalSlug?: string | null
}

export interface AdminPartenairesTableProps {
  items: PartenaireRow[]
  total: number
  currentPage?: number
  totalPages?: number
  verifieFilter?: 'tous' | 'oui' | 'non'
  search?: string
  /** GUIC-684 — programmes proposés au rattachement. */
  programmes?: ProgrammeOption[]
}

const FILTERS: { value: 'tous' | 'oui' | 'non'; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'oui', label: 'Vérifiés' },
  { value: 'non', label: 'Non vérifiés' },
]

function Row({ item, onResult, onEdit }: {
  item: PartenaireRow
  onResult: (m: string, v: ToastVariant) => void
  onEdit: (p: PartenaireRow) => void
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggleVerifie() {
    startTransition(async () => {
      try {
        await basculerVerifiePartenaire(item.id, !item.estVerifie)
        onResult(item.estVerifie ? `« ${item.nom} » dévérifié.` : `« ${item.nom} » vérifié.`, 'success')
        router.refresh()
      } catch {
        onResult('Action impossible.', 'danger')
      }
    })
  }

  return (
    <div className="rounded-[14px] p-[16px] flex items-start gap-[12px] flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      {item.logoUrl ? (
        <img src={item.logoUrl} alt={`Logo ${item.nom}`} width={40} height={40} style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'cover', border: '1.5px solid var(--gj-line)', background: '#fff', flexShrink: 0 }} />
      ) : (
        <span aria-hidden style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)', fontWeight: 900, fontSize: 13 }}>{item.nom.slice(0, 2).toUpperCase()}</span>
      )}
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>{item.nom}</span>
          {item.estVerifie ? (
            <span className="inline-flex items-center gap-[4px] rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-green-soft, #e6f6ec)', color: 'var(--gj-green-ink, #1a7a3d)' }}>
              <Icon name="check-circle" size={11} /> Vérifié
            </span>
          ) : (
            <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>
              Non vérifié
            </span>
          )}
        </div>
        <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
          {[item.secteur?.replace(/_/g, ' '), item.region?.replace(/_/g, ' '), item.email].filter(Boolean).join(' · ') || '—'}
          {' · '}{item.opportunitesCount} opportunité{item.opportunitesCount > 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex items-center gap-[8px] flex-wrap">
        <Link href={`/admin/partenaires/${item.id}`} className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px]" style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>
          <Icon name="eye" size={14} /> Détail
        </Link>
        <button type="button" onClick={() => onEdit(item)} className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px]" style={{ background: 'var(--gj-surface)', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}>
          <Icon name="settings" size={14} /> Éditer
        </button>
        <button type="button" disabled={pending} onClick={toggleVerifie} className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60" style={{ background: item.estVerifie ? 'var(--gj-surface)' : 'var(--gj-green, #2b9e54)', color: item.estVerifie ? 'var(--gj-grey)' : '#fff', border: item.estVerifie ? '1.5px solid var(--gj-line)' : 'none' }}>
          <Icon name={item.estVerifie ? 'close' : 'check'} size={14} /> {item.estVerifie ? 'Dévérifier' : 'Vérifier'}
        </button>
      </div>
    </div>
  )
}

/** AdminPartenairesTable (GUIC-510) — gestion des organisations recruteurs. */
export function AdminPartenairesTable({ items, total, currentPage = 1, totalPages = 1, verifieFilter = 'tous', search = '', programmes = [] }: AdminPartenairesTableProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [editing, setEditing] = useState<PartenaireValues | null>(null)

  function baseUrl(f: 'tous' | 'oui' | 'non') {
    return f === 'tous' ? '/admin/partenaires' : `/admin/partenaires?verifie=${f}`
  }

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="mb-4">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Partenaires</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{total} organisation{total > 1 ? 's' : ''} recruteur{total > 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-[10px] flex-wrap mb-4">
          <div className="flex items-center gap-[6px] flex-wrap" role="tablist" aria-label="Filtrer par vérification">
            {FILTERS.map((f) => {
              const active = f.value === verifieFilter
              return (
                <Link key={f.value} href={baseUrl(f.value)} role="tab" aria-selected={active} className="text-[12.5px] font-bold rounded-full px-[14px] py-[6px]" style={{ background: active ? 'var(--gj-teal)' : 'var(--gj-surface)', color: active ? '#fff' : 'var(--gj-grey)', border: `1.5px solid ${active ? 'var(--gj-teal)' : 'var(--gj-line)'}` }}>
                  {f.label}
                </Link>
              )
            })}
          </div>
          <form method="GET" className="flex items-center gap-[6px] ml-auto">
            {verifieFilter !== 'tous' && <input type="hidden" name="verifie" value={verifieFilter} />}
            <input name="q" defaultValue={search} placeholder="Rechercher un partenaire…" className="rounded-[9px] border-[1.5px] px-[12px] py-[8px] text-[13px] min-w-[200px]" style={{ borderColor: 'var(--gj-line)' }} />
            <button type="submit" className="inline-flex items-center gap-[6px] font-bold text-[13px] rounded-[9px] px-[12px] py-[8px]" style={{ background: 'var(--gj-teal)', color: '#fff' }}>
              <Icon name="search" size={14} />
            </button>
          </form>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
            <p className="text-[14px] font-bold">Aucun partenaire pour ce filtre.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {items.map((item) => (
              <Row key={item.id} item={item} onResult={(m, v) => setFeedback({ message: m, variant: v })} onEdit={(p) => setEditing({ id: p.id, nom: p.nom, description: p.description ?? null, logoUrl: p.logoUrl ?? null, secteur: p.secteur, region: p.region, email: p.email })} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={baseUrl(verifieFilter)} ariaLabel="Pagination" />
          </div>
        )}
      </div>

      {editing && (
        <PartenaireFormModal
          isOpen
          onClose={() => setEditing(null)}
          partenaire={editing}
          programmes={programmes}
          onSuccess={() => setFeedback({ message: 'Partenaire mis à jour.', variant: 'success' })}
        />
      )}
      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
