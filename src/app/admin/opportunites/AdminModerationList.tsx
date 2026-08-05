'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { FiltreMod, ModerationKpis, ModerationRow } from '@/lib/loaders/admin-moderation'
import type { ModerationDetail } from '@/lib/loaders/moderation-detail'
import { approuverOpportunite, chargerModerationDetail } from './actions'
import { RejetMotifModal } from './RejetMotifModal'
import { ModerationDetailPanel } from './ModerationDetailPanel'

export interface AdminModerationListProps {
  rows: ModerationRow[]
  kpis: ModerationKpis
  total: number
  currentPage: number
  totalPages: number
  q: string
  filtre: FiltreMod
}

const CHIPS: { key: FiltreMod; label: string; kpi: keyof ModerationKpis }[] = [
  { key: 'tout', label: 'Tout', kpi: 'tout' },
  { key: 'signalees', label: 'Signalées', kpi: 'signalees' },
  { key: 'nouvelles', label: 'Nouvelles', kpi: 'nouvelles' },
  { key: 'recruteur', label: 'Recruteur', kpi: 'recruteur' },
  { key: 'veille', label: 'Veille', kpi: 'veille' },
]

/** Couleur de tag par type d'offre (registre admin). */
function tagStyle(): { background: string; color: string } {
  return { background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }
}

function hrefFor(filtre: FiltreMod, q: string): string {
  const p = new URLSearchParams()
  if (filtre !== 'tout') p.set('filtre', filtre)
  if (q) p.set('q', q)
  const s = p.toString()
  return s ? `/admin/opportunites?${s}` : '/admin/opportunites'
}

type ResultHandler = (message: string, variant: ToastVariant) => void

// ─── carte ──────────────────────────────────────────────────────────────────
function ModerationCard({
  row,
  onResult,
  onRejeter,
  onOpenDetail,
  loading,
}: {
  row: ModerationRow
  onResult: ResultHandler
  onRejeter: (row: ModerationRow) => void
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

  return (
    <div
      className="rounded-[14px] p-[16px]"
      style={{
        background: 'var(--gj-surface)',
        border: `1.5px solid ${row.niveau === 'crit' ? 'var(--gj-red)' : 'var(--gj-line)'}`,
      }}
    >
      <div className="flex items-start gap-[12px]">
        <div className="flex-1 min-w-0">
          {/* Titre + type + âge + flag */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide"
              style={tagStyle()}
            >
              {row.typeLabel}
            </span>
            <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>
              {row.titre}
            </span>
            <span
              className="text-[11px] font-bold px-[8px] py-[1px] rounded-full"
              style={{
                background: row.urgent ? 'var(--gj-red-soft)' : 'var(--gj-line)',
                color: row.urgent ? 'var(--gj-red-ink)' : 'var(--gj-grey)',
              }}
            >
              {row.ageLabel}
            </span>
            {flag && (
              <span
                className="inline-flex items-center gap-[4px] text-[10px] font-black px-[8px] py-[2px] rounded-full uppercase"
                style={{ background: flag.bg, color: flag.fg }}
              >
                <Icon name={row.niveau === 'crit' ? 'alert' : 'info'} size={11} />
                {flag.label}
              </span>
            )}
          </div>

          {/* Méta : source + organisation */}
          <div className="flex items-center gap-[6px_12px] flex-wrap mt-[6px] text-[12px]" style={{ color: 'var(--gj-grey)' }}>
            <span
              className="text-[10.5px] font-black px-[8px] py-[1px] rounded-full uppercase"
              style={{ border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}
            >
              {row.source === 'recruteur' ? 'Recruteur' : row.source === 'veille' ? 'Veille' : 'Admin'}
            </span>
            <span>
              Par <b style={{ color: 'var(--gj-ink)' }}>{row.organisation}</b>
            </span>
            <button
              type="button"
              onClick={() => onOpenDetail(row.id)}
              disabled={loading}
              className="ml-auto text-[11.5px] font-bold inline-flex items-center gap-[3px] disabled:opacity-50"
              style={{ color: 'var(--gj-teal-deep)' }}
            >
              {loading ? 'Chargement…' : 'Voir le détail'}
              <Icon name="chevron-right" size={13} />
            </button>
          </div>

          {/* Extrait rapide (le dossier complet est dans le panneau slide-over) */}
          {row.extrait && (
            <p className="mt-[8px] text-[12.5px]" style={{ color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'min(100%,660px)' }}>
              {row.extrait}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[8px] flex-wrap mt-[14px]">
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={pending}
          onClick={handleApprouver}
          className="inline-flex items-center gap-[6px] font-black text-[12.5px] !rounded-[9px] disabled:opacity-60 min-h-[40px]"
          style={{ background: 'var(--gj-green)' }}
        >
          <Icon name="check" size={14} />
          Approuver
        </Button>
        <Link
          href={`/admin/opportunites/${row.id}/modifier`}
          className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[40px]"
          style={{ background: 'var(--gj-surface)', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}
        >
          <Icon name="settings" size={14} />
          Corriger
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => onRejeter(row)}
          className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[40px] disabled:opacity-60"
          style={{ background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' }}
        >
          <Icon name="close" size={14} />
          Rejeter
        </button>
        <a
          href={`/admin/opportunites/${row.id}/apercu`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[40px]"
          style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}
        >
          <Icon name="eye" size={14} />
          Aperçu
        </a>
      </div>
    </div>
  )
}

// ─── composant principal ─────────────────────────────────────────────────────
export function AdminModerationList({ rows, kpis, total, currentPage, totalPages, q, filtre }: AdminModerationListProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [rejet, setRejet] = useState<ModerationRow | null>(null)
  const [detail, setDetail] = useState<ModerationDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [, startDetail] = useTransition()
  const onResult: ResultHandler = (message, variant) => setFeedback({ message, variant })

  function openDetail(id: string) {
    setLoadingId(id)
    startDetail(async () => {
      try {
        const d = await chargerModerationDetail(id)
        if (d) setDetail(d)
        else onResult('Offre introuvable.', 'danger')
      } catch {
        onResult('Échec du chargement du dossier.', 'danger')
      } finally {
        setLoadingId(null)
      }
    })
  }

  async function approuverDepuisPanel(id: string, titre: string) {
    try {
      await approuverOpportunite(id)
      onResult(`« ${titre} » publiée.`, 'success')
      setDetail(null)
    } catch {
      onResult(`Échec : « ${titre} » a peut-être déjà été modérée.`, 'danger')
    }
  }

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* En-tête */}
        <div className="mb-4">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>
            Modération
          </h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
            {total} publication{total > 1 ? 's' : ''} en attente de validation
          </p>
        </div>

        {/* Filtres + recherche */}
        <div className="flex items-center gap-[8px] flex-wrap mb-[10px]">
          {CHIPS.map((c) => {
            const on = filtre === c.key
            return (
              <Link
                key={c.key}
                href={hrefFor(c.key, q)}
                className="text-[12px] font-bold px-[12px] py-[6px] rounded-full"
                style={{
                  background: on ? 'var(--gj-teal-deep)' : 'var(--gj-surface)',
                  color: on ? '#fff' : 'var(--gj-grey)',
                  border: `1.5px solid ${on ? 'var(--gj-teal-deep)' : 'var(--gj-line)'}`,
                }}
              >
                {c.label} · {kpis[c.kpi]}
              </Link>
            )
          })}
          <span className="flex-1" />
          <span className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>
            Objectif <b style={{ color: 'var(--gj-ink)' }}>&lt; 48 h</b>
          </span>
          <button
            type="button"
            onClick={() => onResult('Sélection groupée disponible prochainement.', 'info')}
            className="text-[11.5px] font-black px-[12px] py-[6px] rounded-full inline-flex items-center gap-[4px]"
            style={{ background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)', border: '1.5px solid var(--gj-green)' }}
          >
            <Icon name="check" size={12} />
            Approuver les vérifiés
          </button>
        </div>

        {/* Recherche */}
        <form action="/admin/opportunites" method="get" className="mb-[14px]">
          {filtre !== 'tout' && <input type="hidden" name="filtre" value={filtre} />}
          <div
            className="flex items-center gap-[8px] rounded-[10px] px-[12px] py-[8px]"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}
          >
            <Icon name="search" size={15} className="opacity-60" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher une offre, un organisme…"
              aria-label="Rechercher une publication"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--gj-ink)' }}
            />
          </div>
        </form>

        {/* Liste / état vide */}
        {rows.length === 0 ? (
          <div
            className="rounded-[14px] p-[40px] text-center flex flex-col items-center gap-[10px]"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}
          >
            <Icon name="check-circle" size={34} className="opacity-40" />
            <p className="text-[16px] font-black" style={{ color: 'var(--gj-ink)' }}>
              File à jour 🎉
            </p>
            <p className="text-[13px]">Aucune offre en attente. Les prochains dépôts apparaîtront ici.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {rows.map((row) => (
              <ModerationCard
                key={row.id}
                row={row}
                onResult={onResult}
                onRejeter={setRejet}
                onOpenDetail={openDetail}
                loading={loadingId === row.id}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl={hrefFor(filtre, q)}
              ariaLabel="Pagination"
            />
          </div>
        )}
      </div>

      {detail && (
        <ModerationDetailPanel
          detail={detail}
          onClose={() => setDetail(null)}
          onApprouver={() => approuverDepuisPanel(detail.id, detail.titre)}
          onRejeter={() => {
            setRejet({ id: detail.id, titre: detail.titre } as ModerationRow)
            setDetail(null)
          }}
          onCorriger={() => onResult('Demande de correction disponible prochainement.', 'info')}
        />
      )}

      {rejet && (
        <RejetMotifModal
          isOpen
          onClose={() => setRejet(null)}
          offreId={rejet.id}
          offreTitre={rejet.titre}
          onDone={(message, ok) => onResult(message, ok ? 'success' : 'danger')}
        />
      )}

      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
