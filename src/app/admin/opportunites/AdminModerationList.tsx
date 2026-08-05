'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { FiltreMod, ModerationKpis, ModerationRow } from '@/lib/loaders/admin-moderation'
import type { ModerationDetail } from '@/lib/loaders/moderation-detail'
import { approuverOpportunite, approuverPlusieurs, rejeterOpportunite, rejeterPlusieurs, chargerModerationDetail } from './actions'
import { RejetMotifModal } from './RejetMotifModal'
import { CorrectionModal } from './CorrectionModal'
import { ModerationDetailPanel } from './ModerationDetailPanel'

export interface AdminModerationListProps {
  rows: ModerationRow[]
  kpis: ModerationKpis
  total: number
  currentPage: number
  totalPages: number
  q: string
  filtre: FiltreMod
  verifiesIds: string[]
  tronque: boolean
  totalBrouillons: number
}

const CHIPS: { key: FiltreMod; label: string; kpi: keyof ModerationKpis }[] = [
  { key: 'tout', label: 'Tout', kpi: 'tout' },
  { key: 'signalees', label: 'Signalées', kpi: 'signalees' },
  { key: 'nouvelles', label: 'Nouvelles', kpi: 'nouvelles' },
  { key: 'recruteur', label: 'Recruteur', kpi: 'recruteur' },
  { key: 'veille', label: 'Veille', kpi: 'veille' },
]

function hrefFor(filtre: FiltreMod, q: string): string {
  const p = new URLSearchParams()
  if (filtre !== 'tout') p.set('filtre', filtre)
  if (q) p.set('q', q)
  const s = p.toString()
  return s ? `/admin/opportunites?${s}` : '/admin/opportunites'
}

type ResultHandler = (message: string, variant: ToastVariant) => void
const SRC_LABEL: Record<ModerationRow['source'], string> = { recruteur: 'Recruteur', veille: 'Veille', admin: 'Admin' }

// ─── carte ──────────────────────────────────────────────────────────────────
function ModerationCard({
  row,
  checked,
  onToggle,
  onResult,
  onRejeter,
  onCorriger,
  onOpenDetail,
  loading,
}: {
  row: ModerationRow
  checked: boolean
  onToggle: (id: string) => void
  onResult: ResultHandler
  onRejeter: (row: ModerationRow) => void
  onCorriger: (row: ModerationRow) => void
  onOpenDetail: (id: string) => void
  loading: boolean
}) {
  const [pending, startTransition] = useTransition()

  function handleApprouver() {
    startTransition(async () => {
      try {
        await approuverOpportunite(row.id)
        onResult(`« ${row.titre} » publiée.`, 'success')
      } catch {
        onResult(`Échec : « ${row.titre} » a peut-être déjà été modérée.`, 'danger')
      }
    })
  }

  const flag =
    row.niveau === 'crit'
      ? { label: 'Signalée', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' }
      : row.niveau === 'soft'
        ? { label: 'À vérifier', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
        : null

  const miniBtn = (color: string, border: string): CSSProperties => ({
    width: 38, height: 38, display: 'inline-grid', placeItems: 'center', borderRadius: 9,
    background: 'transparent', color, border: `1.5px solid ${border}`, cursor: 'pointer', flex: 'none',
  })

  return (
    <div
      className="rounded-[14px] p-[16px] flex items-start gap-[12px]"
      style={{
        background: 'var(--gj-surface)',
        border: `1.5px solid ${checked ? 'var(--gj-admin-gold)' : row.niveau === 'crit' ? 'var(--gj-red)' : 'var(--gj-line)'}`,
        boxShadow: checked ? '0 0 0 1px var(--gj-admin-gold)' : undefined,
      }}
    >
      {/* Sélection */}
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(row.id)}
        aria-label={`Sélectionner ${row.titre}`}
        style={{ width: 17, height: 17, marginTop: 3, accentColor: 'var(--gj-admin-gold)', cursor: 'pointer', flex: 'none' }}
      />

      {/* Corps + actions : empilés < md, côte à côte ≥ md (V3 responsive) */}
      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-start gap-[12px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}>
            {row.typeLabel}
          </span>
          <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>{row.titre}</span>
          <span className="text-[11px] font-bold px-[8px] py-[1px] rounded-full" style={{ background: row.urgent ? 'var(--gj-red-soft)' : 'var(--gj-line)', color: row.urgent ? 'var(--gj-red-ink)' : 'var(--gj-grey)' }}>
            {row.ageLabel}
          </span>
          {flag && (
            <span className="inline-flex items-center gap-[4px] text-[10px] font-black px-[8px] py-[2px] rounded-full uppercase" style={{ background: flag.bg, color: flag.fg }}>
              <Icon name={row.niveau === 'crit' ? 'alert' : 'info'} size={11} />
              {flag.label}
            </span>
          )}
        </div>

        {/* Méta : source + organisation + localisation (écart C) */}
        <div className="flex items-center gap-[6px_12px] flex-wrap mt-[6px] text-[12px]" style={{ color: 'var(--gj-grey)' }}>
          <span className="text-[10.5px] font-black px-[8px] py-[1px] rounded-full uppercase" style={{ border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
            {SRC_LABEL[row.source]}
          </span>
          <span>Par <b style={{ color: 'var(--gj-ink)' }}>{row.organisation}</b></span>
          {row.localisation && <span>{row.localisation}</span>}
          <button type="button" onClick={() => onOpenDetail(row.id)} disabled={loading} className="ml-auto text-[11.5px] font-bold inline-flex items-center gap-[3px] disabled:opacity-50" style={{ color: 'var(--gj-teal-deep)' }}>
            {loading ? 'Chargement…' : 'Voir le détail'}
            <Icon name="chevron-right" size={13} />
          </button>
        </div>

        {row.extrait && (
          <p className="mt-[8px] text-[12.5px]" style={{ color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'min(100%,660px)' }}>
            {row.extrait}
          </p>
        )}
      </div>

      {/* Actions (écart D) : Approuver plein + Corriger/Rejeter en mini-icônes */}
      <div className="flex items-center gap-[7px] md:flex-none flex-wrap">
        <Button variant="primary" size="sm" type="button" disabled={pending} onClick={handleApprouver} className="inline-flex items-center gap-[6px] font-black text-[12.5px] !rounded-[9px] disabled:opacity-60" style={{ background: 'var(--gj-green)', minHeight: 38 }}>
          <Icon name="check" size={14} /> Approuver
        </Button>
        <button type="button" disabled={pending} onClick={() => onCorriger(row)} aria-label={`Demander correction — ${row.titre}`} title="Demander correction" style={miniBtn('var(--gj-teal-deep)', 'var(--gj-teal)')}>
          <Icon name="settings" size={15} />
        </button>
        <button type="button" disabled={pending} onClick={() => onRejeter(row)} aria-label={`Rejeter — ${row.titre}`} title="Rejeter" style={miniBtn('var(--gj-red-ink)', 'var(--gj-red)')}>
          <Icon name="close" size={15} />
        </button>
      </div>
      </div>
    </div>
  )
}

// ─── composant principal ─────────────────────────────────────────────────────
export function AdminModerationList({ rows, kpis, total, currentPage, totalPages, q, filtre, verifiesIds, tronque, totalBrouillons }: AdminModerationListProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [rejetCible, setRejetCible] = useState<{ cible: string; run: (motif: string) => Promise<void> } | null>(null)
  const [correction, setCorrection] = useState<ModerationRow | null>(null)
  const [detail, setDetail] = useState<ModerationDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [, startAction] = useTransition()
  const onResult: ResultHandler = (message, variant) => setFeedback({ message, variant })

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }
  function bulkApprouver(ids: string[], label: string) {
    if (ids.length === 0) { onResult('Aucune offre à approuver.', 'info'); return }
    startAction(async () => {
      try {
        const r = await approuverPlusieurs(ids)
        onResult(`${r.approuvees} ${label} approuvée${r.approuvees > 1 ? 's' : ''}${r.ignorees ? ` · ${r.ignorees} ignorée${r.ignorees > 1 ? 's' : ''}` : ''}.`, 'success')
        setSelected(new Set())
      } catch {
        onResult('Échec de l’approbation groupée.', 'danger')
      }
    })
  }
  function openDetail(id: string) {
    setLoadingId(id)
    startAction(async () => {
      try {
        const d = await chargerModerationDetail(id)
        if (d) setDetail(d); else onResult('Offre introuvable.', 'danger')
      } catch {
        onResult('Échec du chargement du dossier.', 'danger')
      } finally { setLoadingId(null) }
    })
  }
  async function approuverDepuisPanel(id: string, titre: string) {
    try { await approuverOpportunite(id); onResult(`« ${titre} » publiée.`, 'success'); setDetail(null) }
    catch { onResult(`Échec : « ${titre} » a peut-être déjà été modérée.`, 'danger') }
  }
  function askRejetSingle(row: { id: string; titre: string }) {
    setRejetCible({
      cible: `« ${row.titre} »`,
      run: async (motif) => {
        try { await rejeterOpportunite(row.id, motif); onResult(`« ${row.titre} » rejetée.`, 'success') }
        catch { onResult(`Échec : « ${row.titre} » a peut-être déjà été modérée.`, 'danger') }
      },
    })
  }
  function askRejetBatch(ids: string[]) {
    setRejetCible({
      cible: `${ids.length} offre${ids.length > 1 ? 's' : ''} sélectionnée${ids.length > 1 ? 's' : ''}`,
      run: async (motif) => {
        try {
          const r = await rejeterPlusieurs(ids, motif)
          onResult(`${r.rejetees} rejetée${r.rejetees > 1 ? 's' : ''}${r.ignorees ? ` · ${r.ignorees} ignorée${r.ignorees > 1 ? 's' : ''}` : ''}.`, 'success')
          setSelected(new Set())
        } catch { onResult('Échec du rejet groupé.', 'danger') }
      },
    })
  }

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="mb-4">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Modération</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
            {total} publication{total > 1 ? 's' : ''} en attente de validation
          </p>
        </div>

        {/* Filtres + quick-action */}
        <div className="flex items-center gap-[8px] flex-wrap mb-[10px]">
          {CHIPS.map((c) => {
            const on = filtre === c.key
            return (
              <Link key={c.key} href={hrefFor(c.key, q)} className="text-[12px] font-bold px-[12px] py-[6px] rounded-full" style={{ background: on ? 'var(--gj-teal-deep)' : 'var(--gj-surface)', color: on ? '#fff' : 'var(--gj-grey)', border: `1.5px solid ${on ? 'var(--gj-teal-deep)' : 'var(--gj-line)'}` }}>
                {c.label} · {kpis[c.kpi]}
              </Link>
            )
          })}
          <span className="flex-1" />
          <span className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>Objectif <b style={{ color: 'var(--gj-ink)' }}>&lt; 48 h</b></span>
          <button type="button" onClick={() => bulkApprouver(verifiesIds, 'vérifiée')} className="text-[11.5px] font-black px-[12px] py-[6px] rounded-full inline-flex items-center gap-[4px]" style={{ background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)', border: '1.5px solid var(--gj-green)' }}>
            <Icon name="check" size={12} /> Approuver les vérifiés · {verifiesIds.length}
          </button>
        </div>

        {/* F4 — bannière de troncature : la file dépasse le plafond, compteurs approximatifs */}
        {tronque && (
          <div className="flex items-center gap-[8px] rounded-[10px] px-[12px] py-[8px] mb-[10px] text-[12.5px]" style={{ background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)', border: '1.5px solid var(--gj-yellow)' }}>
            <Icon name="alert" size={15} />
            <span><b>{totalBrouillons} offres en attente</b> — seules les {rows.length === 0 ? 0 : Math.min(totalBrouillons, 300)} plus anciennes sont chargées ; les compteurs sont approximatifs. Affinez la recherche pour traiter la file.</span>
          </div>
        )}

        {/* Recherche */}
        <form action="/admin/opportunites" method="get" className="mb-[10px]">
          {filtre !== 'tout' && <input type="hidden" name="filtre" value={filtre} />}
          <div className="flex items-center gap-[8px] rounded-[10px] px-[12px] py-[8px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
            <Icon name="search" size={15} className="opacity-60" />
            <input name="q" defaultValue={q} placeholder="Rechercher une offre, un organisme…" aria-label="Rechercher une publication" className="flex-1 bg-transparent text-[13px] outline-none" style={{ color: 'var(--gj-ink)' }} />
          </div>
        </form>

        {/* Barre de sélection groupée */}
        {rows.length > 0 && (
          <div className="flex items-center gap-[10px] mb-[10px] px-[4px]">
            <label className="inline-flex items-center gap-[7px] text-[12px] font-bold" style={{ color: 'var(--gj-grey)', cursor: 'pointer' }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tout sélectionner" style={{ width: 16, height: 16, accentColor: 'var(--gj-admin-gold)', cursor: 'pointer' }} />
              Tout sélectionner
            </label>
            {selected.size > 0 && (
              <div role="region" aria-label="Sélection groupée" className="flex items-center gap-[10px] rounded-[10px] px-[12px] py-[7px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-admin-gold)' }}>
                <b className="text-[13px]" style={{ color: 'var(--gj-admin-gold)' }}>{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</b>
                <button type="button" onClick={() => bulkApprouver([...selected], 'offre')} className="text-[12px] font-black px-[12px] py-[7px] rounded-[9px]" style={{ background: 'var(--gj-green)', color: '#08130E' }}>Approuver la sélection</button>
                <button type="button" onClick={() => askRejetBatch([...selected])} className="text-[12px] font-black px-[12px] py-[7px] rounded-[9px]" style={{ background: 'transparent', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' }}>Rejeter la sélection</button>
                <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-bold px-[12px] py-[7px] rounded-[9px]" style={{ background: 'transparent', color: 'var(--gj-grey)', border: '1px solid var(--gj-line)' }}>Annuler</button>
              </div>
            )}
          </div>
        )}

        {/* Liste / état vide — contextuel (recherche/filtre vs file vide) */}
        {rows.length === 0 ? (
          q || filtre !== 'tout' ? (
            <div className="rounded-[14px] p-[40px] text-center flex flex-col items-center gap-[10px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
              <Icon name="search" size={30} className="opacity-40" />
              <p className="text-[16px] font-black" style={{ color: 'var(--gj-ink)' }}>Aucun résultat</p>
              <p className="text-[13px]">Aucune offre ne correspond à cette recherche.</p>
              <Link href="/admin/opportunites" className="text-[12.5px] font-bold" style={{ color: 'var(--gj-teal-deep)' }}>Réinitialiser les filtres</Link>
            </div>
          ) : (
            <div className="rounded-[14px] p-[40px] text-center flex flex-col items-center gap-[10px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
              <Icon name="check-circle" size={34} className="opacity-40" />
              <p className="text-[16px] font-black" style={{ color: 'var(--gj-ink)' }}>File à jour 🎉</p>
              <p className="text-[13px]">Aucune offre en attente. Les prochains dépôts apparaîtront ici.</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-[12px]">
            {rows.map((row) => (
              <ModerationCard key={row.id} row={row} checked={selected.has(row.id)} onToggle={toggle} onResult={onResult} onRejeter={askRejetSingle} onCorriger={setCorrection} onOpenDetail={openDetail} loading={loadingId === row.id} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={hrefFor(filtre, q)} ariaLabel="Pagination" />
          </div>
        )}
      </div>

      {detail && (
        <ModerationDetailPanel
          detail={detail}
          onClose={() => setDetail(null)}
          onApprouver={() => approuverDepuisPanel(detail.id, detail.titre)}
          onRejeter={() => { askRejetSingle({ id: detail.id, titre: detail.titre }); setDetail(null) }}
          onCorriger={() => { setCorrection({ id: detail.id, titre: detail.titre } as ModerationRow); setDetail(null) }}
        />
      )}

      {rejetCible && (
        <RejetMotifModal isOpen onClose={() => setRejetCible(null)} cible={rejetCible.cible} onConfirm={rejetCible.run} />
      )}
      {correction && (
        <CorrectionModal isOpen onClose={() => setCorrection(null)} offreId={correction.id} offreTitre={correction.titre} onDone={(m, ok) => onResult(m, ok ? 'success' : 'danger')} />
      )}

      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
