'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { PartenaireCard } from '@/components/ui/PartenaireCard'
import { PartenaireFormModal, type PartenaireValues } from './PartenaireFormModal'
import { PartenaireSheet } from './PartenaireSheet'

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
}

export interface AdminPartenairesTableProps {
  items: PartenaireRow[]
  total: number
  currentPage?: number
  totalPages?: number
  verifieFilter?: 'tous' | 'oui' | 'non'
  search?: string
}

const FILTERS: { value: 'tous' | 'oui' | 'non'; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'oui', label: 'Vérifiés' },
  { value: 'non', label: 'Non vérifiés' },
]

/**
 * AdminPartenairesTable (GUIC-510 · refonte registre GUIC-681) — grille de cartes
 * « letterhead » des organisations recruteurs ; clic carte → dossier slide-over
 * (vérifier / éditer / fiche complète). Filtres, recherche et pagination conservés.
 */
export function AdminPartenairesTable({ items, total, currentPage = 1, totalPages = 1, verifieFilter = 'tous', search = '' }: AdminPartenairesTableProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [editing, setEditing] = useState<PartenaireValues | null>(null)
  const [sheetTarget, setSheetTarget] = useState<PartenaireRow | null>(null)

  function baseUrl(f: 'tous' | 'oui' | 'non') {
    return f === 'tous' ? '/admin/partenaires' : `/admin/partenaires?verifie=${f}`
  }

  function openEdit(p: PartenaireRow) {
    setSheetTarget(null)
    setEditing({ id: p.id, nom: p.nom, description: p.description ?? null, logoUrl: p.logoUrl ?? null, secteur: p.secteur, region: p.region, email: p.email })
  }

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
            <input name="q" defaultValue={search} placeholder="Rechercher un partenaire…" className="rounded-[9px] border-[1.5px] px-[12px] py-[8px] text-[13px] min-w-[200px]" style={{ borderColor: 'var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)' }} />
            <button type="submit" aria-label="Rechercher" className="inline-flex items-center gap-[6px] font-bold text-[13px] rounded-[9px] px-[12px] py-[8px]" style={{ background: 'var(--gj-teal)', color: '#fff' }}>
              <Icon name="search" size={14} />
            </button>
          </form>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
            <p className="text-[14px] font-bold">Aucun partenaire pour ce filtre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
            {items.map((item) => (
              <PartenaireCard key={item.id} partenaire={item} onOpen={() => setSheetTarget(item)} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={baseUrl(verifieFilter)} ariaLabel="Pagination" />
          </div>
        )}
      </div>

      <PartenaireSheet
        partenaire={sheetTarget}
        onClose={() => setSheetTarget(null)}
        onEdit={openEdit}
        onToast={(message, variant) => setFeedback({ message, variant })}
      />

      {editing && (
        <PartenaireFormModal
          isOpen
          onClose={() => setEditing(null)}
          partenaire={editing}
          onSuccess={() => setFeedback({ message: 'Partenaire mis à jour.', variant: 'success' })}
        />
      )}
      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
