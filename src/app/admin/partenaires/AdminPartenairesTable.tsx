'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { PartenaireCard } from '@/components/ui/PartenaireCard'
import { sectorLabel } from '@/lib/partenaire-secteur'
import type { PartenaireRow, PartenaireKpis, ResumePartenaires, StatutPartenaire, TriPartenaire } from '@/lib/loaders/admin-partenaires'
import { PartenaireFormModal, type PartenaireValues } from './PartenaireFormModal'
import { PartenaireSheet } from './PartenaireSheet'

export type { PartenaireRow } from '@/lib/loaders/admin-partenaires'

export interface AdminPartenairesTableProps {
  items: PartenaireRow[]
  total: number
  currentPage?: number
  totalPages?: number
  kpis: PartenaireKpis
  resume: ResumePartenaires
  secteursDispo: string[]
  statut: StatutPartenaire
  tri: TriPartenaire
  secteur: string
  search?: string
}

/** Tuile KPI de synthèse (header maquette). `trend` = « +N ce mois ». */
function StatTuile({ valeur, label, trend }: { valeur: number; label: string; trend?: number }) {
  return (
    <div className="rounded-[12px] px-[15px] py-[12px] flex-1 min-w-[140px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[22px] font-black leading-none" style={{ color: 'var(--gj-ink)' }}>{valeur.toLocaleString('fr-FR')}</span>
        {trend !== undefined && trend > 0 && (
          <span className="text-[11px] font-black" style={{ color: 'var(--gj-green-ink)' }}>+{trend} ce mois</span>
        )}
      </div>
      <div className="text-[11.5px] font-bold mt-[4px]" style={{ color: 'var(--gj-grey)' }}>{label}</div>
    </div>
  )
}

const CHIPS: { key: StatutPartenaire; label: string; kpi: keyof PartenaireKpis }[] = [
  { key: 'tous', label: 'Tous', kpi: 'tous' },
  { key: 'verifies', label: 'Vérifiés', kpi: 'verifies' },
  { key: 'non_verifies', label: 'Non vérifiés', kpi: 'nonVerifies' },
  { key: 'suspendus', label: 'Suspendus', kpi: 'suspendus' },
]

const TRIS: { key: TriPartenaire; label: string }[] = [
  { key: 'nom', label: 'Nom (A-Z)' },
  { key: 'offres', label: 'Offres publiées' },
  { key: 'candidatures', label: 'Candidatures' },
  { key: 'recent', label: 'Plus récents' },
]

interface EtatUrl { statut: StatutPartenaire; q: string; secteur: string; tri: TriPartenaire }
function hrefAvec(s: EtatUrl, patch: Partial<EtatUrl>): string {
  const e = { ...s, ...patch }
  const p = new URLSearchParams()
  if (e.statut !== 'tous') p.set('statut', e.statut)
  if (e.q) p.set('q', e.q)
  if (e.secteur) p.set('secteur', e.secteur)
  if (e.tri !== 'nom') p.set('tri', e.tri)
  const str = p.toString()
  return str ? `/admin/partenaires?${str}` : '/admin/partenaires'
}

function SelectFiltre({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="inline-flex items-center gap-[6px] text-[12px] font-bold rounded-full pl-[12px] pr-[8px] py-[5px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="bg-transparent text-[12px] font-bold outline-none cursor-pointer" style={{ color: 'var(--gj-ink)' }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

/**
 * AdminPartenairesTable (GUIC-510 · refonte registre GUIC-681) — grille de cartes
 * « letterhead » des organisations recruteurs ; clic carte → dossier slide-over
 * (vérifier / éditer / fiche complète). Filtres, recherche et pagination conservés.
 */
export function AdminPartenairesTable({ items, total, currentPage = 1, totalPages = 1, kpis, resume, secteursDispo, statut, tri, secteur, search = '' }: AdminPartenairesTableProps) {
  const router = useRouter()
  const etat: EtatUrl = { statut, q: search, secteur, tri }
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [editing, setEditing] = useState<PartenaireValues | null>(null)
  const [sheetTarget, setSheetTarget] = useState<PartenaireRow | null>(null)

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

        {/* Header 4 KPI (conformité maquette) */}
        <div className="flex gap-[10px] flex-wrap mb-4">
          <StatTuile valeur={resume.total} label="Partenaires" trend={resume.nouveauxCeMois} />
          <StatTuile valeur={resume.verifies} label="Vérifiés" />
          <StatTuile valeur={resume.comptesActifs} label="Comptes recruteurs actifs" />
          <StatTuile valeur={resume.offresPubliees} label="Offres publiées" />
        </div>

        {/* Chips statut avec compteurs */}
        <div className="flex items-center gap-[6px] flex-wrap mb-[10px]" role="tablist" aria-label="Filtrer par statut">
          {CHIPS.map((c) => {
            const active = c.key === statut
            return (
              <Link key={c.key} href={hrefAvec(etat, { statut: c.key })} role="tab" aria-selected={active} className="text-[12.5px] font-bold rounded-full px-[14px] py-[6px]" style={{ background: active ? 'var(--gj-teal)' : 'var(--gj-surface)', color: active ? '#fff' : 'var(--gj-grey)', border: `1.5px solid ${active ? 'var(--gj-teal)' : 'var(--gj-line)'}` }}>
                {c.label} · {kpis[c.kpi]}
              </Link>
            )
          })}
        </div>

        {/* Filtre secteur + tri + recherche */}
        <div className="flex items-center gap-[8px] flex-wrap mb-4">
          <SelectFiltre label="Secteur" value={secteur} onChange={(v) => router.push(hrefAvec(etat, { secteur: v }))}
            options={[{ value: '', label: 'Tous les secteurs' }, ...secteursDispo.map((s) => ({ value: s, label: sectorLabel(s) }))]} />
          <SelectFiltre label="Trier" value={tri} onChange={(v) => router.push(hrefAvec(etat, { tri: v as TriPartenaire }))}
            options={TRIS.map((t) => ({ value: t.key, label: t.label }))} />
          <form method="GET" className="flex items-center gap-[6px] ml-auto">
            {statut !== 'tous' && <input type="hidden" name="statut" value={statut} />}
            {secteur && <input type="hidden" name="secteur" value={secteur} />}
            {tri !== 'nom' && <input type="hidden" name="tri" value={tri} />}
            <input name="q" defaultValue={search} placeholder="Rechercher (nom, e-mail)…" className="rounded-[9px] border-[1.5px] px-[12px] py-[8px] text-[13px] min-w-[200px]" style={{ borderColor: 'var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)' }} />
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
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={hrefAvec(etat, {})} ariaLabel="Pagination" />
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
