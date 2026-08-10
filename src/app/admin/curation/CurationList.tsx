'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { CurationRow, VeilleBandeau, OngletC, ChipC } from '@/lib/loaders/admin-curation'
import { versModeration, ignorerDoublon, rejeterItem } from './actions'

export interface CurationListProps {
  rows: CurationRow[]
  chips: { suggerees: number; scoreEleve: number; doublons: number }
  veille: VeilleBandeau
  onglet: OngletC
  chip: ChipC
  currentPage: number
  totalPages: number
}

const CHIPS: { key: ChipC; label: string; kpi: keyof CurationListProps['chips'] }[] = [
  { key: 'tout', label: 'Suggérées', kpi: 'suggerees' },
  { key: 'score', label: 'Score élevé', kpi: 'scoreEleve' },
  { key: 'doublons', label: 'Doublons', kpi: 'doublons' },
]
const ONGLETS: { key: OngletC; label: string }[] = [
  { key: 'a_valider', label: 'À valider' },
  { key: 'en_attente', label: 'En attente' },
  { key: 'approuvee', label: 'Approuvées' },
  { key: 'rejetee', label: 'Rejetées' },
]

const rel = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
function collecteLabel(d: Date | null): string {
  if (!d) return 'aucune collecte'
  const h = Math.round((d.getTime() - Date.now()) / 3600_000)
  if (h > -1) return "à l'instant"
  if (h > -24) return `dernière collecte ${rel.format(h, 'hour')}`
  return `dernière collecte ${rel.format(Math.round(h / 24), 'day')}`
}

type ResultHandler = (message: string, variant: ToastVariant) => void

function CurationCard({ row, onResult }: { row: CurationRow; onResult: ResultHandler }) {
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<unknown>, ok: string) {
    startTransition(async () => {
      try {
        await fn()
        onResult(ok, 'success')
      } catch (e) {
        // Surface le motif réel (ex. « Type d'opportunité requis ») plutôt qu'un échec opaque.
        const msg = e instanceof Error && e.message ? e.message : 'Action impossible — réessaie.'
        onResult(msg, 'danger')
      }
    })
  }

  return (
    <div
      className="rounded-[14px] p-[16px] flex flex-col gap-[10px]"
      style={{ background: 'var(--gj-surface)', border: `1.5px solid ${row.estDoublon ? 'var(--gj-yellow)' : 'var(--gj-line)'}` }}
    >
      {/* Haut : type + source + doublon */}
      <div className="flex items-center gap-2 flex-wrap">
        {row.typeLabel && (
          <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}>
            {row.typeLabel}
          </span>
        )}
        <span className="text-[10.5px] font-black px-[8px] py-[1px] rounded-full uppercase" style={{ border: '1.5px solid var(--gj-line)', color: row.sourceOfficielle ? 'var(--gj-yellow-ink)' : 'var(--gj-grey)' }}>
          {row.sourceNom}
        </span>
        {row.estDoublon && (
          <span className="inline-flex items-center gap-[4px] text-[10px] font-black px-[8px] py-[2px] rounded-full uppercase" style={{ background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
            <Icon name="alert" size={11} /> Doublon ?
          </span>
        )}
      </div>

      <h5 className="text-[15px] font-black m-0" style={{ color: 'var(--gj-ink)' }}>{row.titre}</h5>
      {row.extrait ? (
        <p className="text-[12.5px] m-0" style={{ color: 'var(--gj-grey)' }}>{row.extrait}</p>
      ) : (
        // V1/V2 — extraction sans description : on évite la carte « vide » et on ouvre la source.
        <p className="text-[12px] m-0 italic" style={{ color: 'var(--gj-grey-2)' }}>
          Aucune description extraite — <a href={row.urlSource} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gj-teal-deep)', fontStyle: 'normal', fontWeight: 700 }}>voir la source ↗</a>
        </p>
      )}

      {/* Complétude */}
      <div className="flex items-center gap-[9px] text-[11.5px]" style={{ color: 'var(--gj-grey)' }}>
        Complétude
        <span className="flex-1 h-[7px] rounded-full overflow-hidden" style={{ background: 'var(--gj-line)' }}>
          <span className="block h-full rounded-full" style={{ width: `${row.score}%`, background: row.score >= 70 ? 'var(--gj-green)' : 'var(--gj-yellow)' }} />
        </span>
        <b style={{ color: 'var(--gj-ink)' }}>{row.score} %</b>
      </div>

      {/* Signaux */}
      {row.signaux.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {row.signaux.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-[4px] text-[10.5px] font-bold px-[8px] py-[2px] rounded-full" style={{ background: s.ok ? 'var(--gj-green-soft)' : 'var(--gj-yellow-soft)', color: s.ok ? 'var(--gj-green-ink)' : 'var(--gj-yellow-ink)' }}>
              {s.ok ? '✓' : '⚠'} {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Actions — adaptées au statut (F1) */}
      {row.statut === 'approuvee' ? (
        <Link href="/admin/opportunites" className="inline-flex items-center gap-[6px] font-bold text-[12.5px]" style={{ color: 'var(--gj-teal-deep)' }}>
          <Icon name="check-circle" size={14} /> Approuvée — voir en Modération ›
        </Link>
      ) : row.statut === 'rejetee' ? (
        <p className="text-[12px] m-0" style={{ color: 'var(--gj-red-ink)' }}>
          <Icon name="close" size={13} /> Rejetée{row.motifRejet ? ` — ${row.motifRejet}` : ''}
        </p>
      ) : (
      <div className="flex items-center gap-[7px] flex-wrap mt-[2px]">
        {row.estDoublon ? (
          <button type="button" disabled={pending} onClick={() => run(() => ignorerDoublon(row.id), 'Doublon fusionné (ignoré).')} className="inline-flex items-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] disabled:opacity-60" style={{ background: 'var(--gj-teal-deep)', color: '#fff' }}>
            <Icon name="check" size={14} /> Fusionner
          </button>
        ) : row.complet ? (
          <button type="button" disabled={pending} onClick={() => run(() => versModeration(row.id), `« ${row.titre} » envoyée en Modération.`)} className="inline-flex items-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] disabled:opacity-60" style={{ background: 'var(--gj-green)', color: '#08130E' }}>
            <Icon name="arrow-right" size={14} /> → Modération
          </button>
        ) : (
          // Incomplet (titre/type manquant) : « → Modération » échouerait → on guide vers l'édition.
          <span className="inline-flex items-center gap-[6px] font-bold text-[12px] rounded-[9px] px-[12px] py-[8px]" title="Titre et type d’opportunité requis avant l’envoi en modération" style={{ background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
            <Icon name="alert" size={14} /> À compléter avant modération
          </span>
        )}
        <Link href={`/admin/curation/${row.id}`} className="inline-flex items-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px]" style={{ background: 'var(--gj-surface)', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}>
          <Icon name="settings" size={14} /> Éditer
        </Link>
        <button type="button" disabled={pending} onClick={() => run(() => rejeterItem(row.id, 'Non pertinent — écarté de la curation'), 'Suggestion ignorée.')} className="inline-flex items-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] disabled:opacity-60" style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>
          <Icon name="close" size={14} /> Ignorer
        </button>
      </div>
      )}
    </div>
  )
}

export function CurationList({ rows, chips, veille, onglet, chip, currentPage, totalPages }: CurationListProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const onResult: ResultHandler = (message, variant) => setFeedback({ message, variant })

  const hrefChip = (c: ChipC) => (c === 'tout' ? '/admin/curation' : `/admin/curation?chip=${c}`)

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="mb-3">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Curation</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>Suggestions de la veille à valider — « → Modération » envoie au contrôle, jamais en ligne direct.</p>
        </div>

        {/* Bandeau veille */}
        <div className="flex items-center gap-[10px] rounded-[12px] px-[14px] py-[10px] mb-[12px] flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <span className="inline-block w-[8px] h-[8px] rounded-full" style={{ background: 'var(--gj-green)' }} />
          <b className="text-[13px]" style={{ color: 'var(--gj-ink)' }}>Veille automatique</b>
          <span className="text-[12.5px]" style={{ color: 'var(--gj-grey)' }}>· {veille.nbSources} sources · {collecteLabel(veille.derniereCollecte)}</span>
          <span className="ml-auto text-[11.5px] font-bold px-[10px] py-[3px] rounded-full" style={{ background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>{veille.sourcesNoms.join(' · ')}</span>
          <Link href="/admin/sources-veille" className="text-[11.5px] font-bold" style={{ color: 'var(--gj-teal-deep)' }}>Gérer les sources ›</Link>
        </div>

        {/* Onglets statut */}
        <div className="flex items-center gap-[6px] mb-[10px] flex-wrap">
          {ONGLETS.map((o) => {
            const on = onglet === o.key
            return (
              <Link key={o.key} href={o.key === 'a_valider' ? '/admin/curation' : `/admin/curation?onglet=${o.key}`} className="text-[12px] font-bold px-[12px] py-[6px] rounded-full" style={{ background: on ? 'var(--gj-teal-deep)' : 'var(--gj-surface)', color: on ? '#fff' : 'var(--gj-grey)', border: `1.5px solid ${on ? 'var(--gj-teal-deep)' : 'var(--gj-line)'}` }}>
                {o.label}
              </Link>
            )
          })}
        </div>

        {/* Chips (dans À valider) */}
        {onglet === 'a_valider' && (
          <div className="flex items-center gap-[8px] mb-[12px] flex-wrap">
            {CHIPS.map((c) => {
              const on = chip === c.key
              return (
                <Link key={c.key} href={hrefChip(c.key)} className="text-[12px] font-bold px-[12px] py-[6px] rounded-full" style={{ background: on ? 'var(--gj-admin-gold)' : 'var(--gj-surface)', color: on ? 'var(--gj-admin-on-gold)' : 'var(--gj-grey)', border: `1.5px solid ${on ? 'transparent' : 'var(--gj-line)'}` }}>
                  {c.label} · {chips[c.kpi]}
                </Link>
              )
            })}
          </div>
        )}

        {/* Grille / vide */}
        {rows.length === 0 ? (
          <div className="rounded-[14px] p-[40px] text-center flex flex-col items-center gap-[10px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
            <Icon name="check-circle" size={34} className="opacity-40" />
            <p className="text-[16px] font-black" style={{ color: 'var(--gj-ink)' }}>Aucune suggestion</p>
            <p className="text-[13px]">La file est à jour. Les prochaines collectes de veille apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {rows.map((r) => (
              <CurationCard key={r.id} row={r} onResult={onResult} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={chip === 'tout' ? '/admin/curation' : `/admin/curation?chip=${chip}`} ariaLabel="Pagination" />
          </div>
        )}
      </div>

      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
