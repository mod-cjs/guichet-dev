'use client'

/**
 * GUIC-515 — Kanban des candidatures (design v4 `RecPipeline`).
 * 4 colonnes (Reçues / Présélection / Entretien / Décision), drag-and-drop pour changer
 * d'étape, cartes riches (âge/commune/niveau/skills/match/favori), scope par offre.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { deplacerPipeline, basculerFavori } from './actions'
import type { RecruteurPipeline, PipelineCard, PipelineStageId } from '@/lib/loaders/recruteur'

const COLS: { id: PipelineStageId; label: string; dot: string; soft: string }[] = [
  { id: 'Recue', label: 'Reçues', dot: 'var(--gj-grey, #9aa5b1)', soft: 'var(--gj-bg, #f6f8fa)' },
  { id: 'Preselection', label: 'Présélection', dot: 'var(--gj-blue, #1A4ED8)', soft: 'var(--gj-blue-soft, #E8EFFF)' },
  { id: 'Entretien', label: 'Entretien', dot: 'var(--gj-yellow-deep, #B8860B)', soft: 'var(--gj-yellow-soft, #FCF3D9)' },
  { id: 'Decision', label: 'Décision', dot: 'var(--gj-green, #16A34A)', soft: 'var(--gj-green-soft, #E6F6EE)' },
]

function initials(p: string, n: string) { return ((p.trim()[0] ?? '') + (n.trim()[0] ?? '')).toUpperCase() }
function frDate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }
function matchStyle(m: number): React.CSSProperties {
  if (m >= 85) return { background: 'var(--gj-green-soft, #E6F6EE)', color: 'var(--gj-green-ink, #0F6B45)' }
  if (m >= 70) return { background: 'var(--gj-teal-soft, #d9f2ee)', color: 'var(--gj-teal-deep, #0F766E)' }
  return { background: 'var(--gj-bg, #f6f8fa)', color: 'var(--gj-grey, #6b7280)' }
}

export function PipelineBoard({ pipeline }: { pipeline: RecruteurPipeline }) {
  const router = useRouter()
  const [, start] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<PipelineStageId | null>(null)

  function move(id: string, stage: PipelineStageId) {
    setOver(null); setDragId(null)
    start(async () => { try { await deplacerPipeline(id, stage); router.refresh() } catch { /* noop */ } })
  }
  function fav(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    start(async () => { try { await basculerFavori(id); router.refresh() } catch { /* noop */ } })
  }
  function onOffreChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value
    router.push(v ? `/recruteur/candidatures?offre=${v}` : '/recruteur/candidatures')
  }

  return (
    <div>
      {/* Sélecteur d'offre */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[12.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>Offre :</span>
        <select value={pipeline.offreActiveId ?? ''} onChange={onOffreChange} className="rounded-[10px] border-[1.5px] px-[12px] min-h-[40px] text-[13px] bg-white" style={{ borderColor: 'var(--gj-line)', color: 'var(--gj-ink)' }}>
          <option value="">Toutes les offres</option>
          {pipeline.offres.map((o) => <option key={o.id} value={o.id}>{o.titre}</option>)}
        </select>
      </div>

      {/* Board */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(4, minmax(260px, 1fr))`, gap: 14, alignItems: 'start' }}>
          {COLS.map((col) => {
            const cards = pipeline.colonnes[col.id]
            const isOver = over === col.id
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOver(col.id) }}
                onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
                onDrop={() => dragId && move(dragId, col.id)}
                style={{ display: 'flex', flexDirection: 'column', background: isOver ? col.soft : 'rgba(0,0,0,.015)', borderRadius: 14, border: `1.5px ${isOver ? 'dashed' : 'solid'} var(--gj-line)`, minHeight: 120 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 13px', borderBottom: '1px solid var(--gj-line)', background: col.soft, borderRadius: '14px 14px 0 0' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot }} />
                  <span className="text-[13px] font-black" style={{ color: 'var(--gj-ink)' }}>{col.label}</span>
                  <span className="text-[11px] font-black" style={{ marginLeft: 'auto', color: 'var(--gj-grey)', background: '#fff', padding: '1px 8px', borderRadius: 999 }}>{cards.length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {cards.length === 0 && <p className="text-[12px] text-center py-[10px]" style={{ color: 'var(--gj-grey)' }}>—</p>}
                  {cards.map((c) => <Card key={c.id} c={c} onDragStart={() => setDragId(c.id)} onFav={(e) => fav(e, c.id)} onMove={(stage) => move(c.id, stage)} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Card({ c, onDragStart, onFav, onMove }: { c: PipelineCard; onDragStart: () => void; onFav: (e: React.MouseEvent) => void; onMove: (stage: PipelineStageId) => void }) {
  const idx = COLS.findIndex((cc) => cc.id === c.stage)
  const prev = idx > 0 ? COLS[idx - 1] : null
  const next = idx < COLS.length - 1 ? COLS[idx + 1] : null
  const arrow = (e: React.MouseEvent, stage: PipelineStageId) => { e.preventDefault(); e.stopPropagation(); onMove(stage) }
  return (
    <a
      href={`/recruteur/candidatures/${c.id}`}
      draggable
      onDragStart={onDragStart}
      className="no-underline"
      style={{ background: '#fff', border: '1.5px solid var(--gj-line)', borderRadius: 11, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12.5 }}>{initials(c.prenom, c.nom)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-[13px] font-black truncate" style={{ color: 'var(--gj-ink)' }}>{c.prenom} {c.nom}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--gj-grey)' }}>{[c.age ? `${c.age} ans` : null, c.commune].filter(Boolean).join(' · ') || '—'}</div>
        </div>
        <button type="button" onClick={onFav} aria-label={c.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'} className="inline-flex items-center border-0 bg-transparent p-0" style={{ color: c.favori ? 'var(--gj-yellow-deep, #B8860B)' : 'var(--gj-grey, #c2c9d1)', cursor: 'pointer' }}>
          <Icon name="bookmark" size={15} />
        </button>
      </div>
      {c.niveau && <div className="text-[11px] font-bold" style={{ color: 'var(--gj-grey)' }}>{c.niveau.replace(/_/g, ' ')}</div>}
      {c.skills.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {c.skills.map((s) => <span key={s} className="text-[10px] font-bold" style={{ color: 'var(--gj-grey)', background: 'var(--gj-bg, #f6f8fa)', border: '1px solid var(--gj-line)', padding: '2px 8px', borderRadius: 999 }}>{s}</span>)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--gj-line)', paddingTop: 8 }}>
        {c.match != null ? <span className="text-[10px] font-black" style={{ ...matchStyle(c.match), padding: '2px 8px', borderRadius: 999 }}>{c.match}% match</span> : <span className="text-[10px]" style={{ color: 'var(--gj-grey)' }}>—</span>}
        <span className="text-[10.5px]" style={{ color: 'var(--gj-grey-2, #9aa5b1)' }}>{frDate(c.soumiseA)}</span>
      </div>
      {/* Fallback tactile/clavier : déplacer d'une colonne (le drag reste dispo sur desktop). */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
        <button type="button" disabled={!prev} onClick={(e) => prev && arrow(e, prev.id)} aria-label={prev ? `Déplacer vers ${prev.label}` : undefined} className="flex-1 inline-flex items-center justify-center rounded-[8px] min-h-[30px]" style={{ border: '1px solid var(--gj-line)', background: '#fff', color: prev ? 'var(--gj-grey)' : 'var(--gj-line)', cursor: prev ? 'pointer' : 'default' }}>
          <Icon name="chevron-left" size={14} />
        </button>
        <button type="button" disabled={!next} onClick={(e) => next && arrow(e, next.id)} aria-label={next ? `Déplacer vers ${next.label}` : undefined} className="flex-1 inline-flex items-center justify-center rounded-[8px] min-h-[30px]" style={{ border: '1px solid var(--gj-line)', background: '#fff', color: next ? 'var(--gj-grey)' : 'var(--gj-line)', cursor: next ? 'pointer' : 'default' }}>
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </a>
  )
}
