'use client'

/**
 * GUIC-515 — Kanban des candidatures (design v4 `RecPipeline`).
 * 4 colonnes (Reçues / Présélection / Entretien / Décision), drag-and-drop pour changer
 * d'étape, cartes riches (âge/commune/niveau/skills/match/favori), scope par offre.
 * GUIC-647 — sélection multiple (carte / colonne) + barre d'actions groupées
 * (déplacer d'étape, retenir, refuser, favori).
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { deplacerPipeline, basculerFavori, deplacerPipelineGroupe, changerStatutGroupe, basculerFavoriGroupe } from './actions'
import { listMesTemplates, envoyerEmailGroupe } from '@/app/recruteur/modeles-emails/actions'
import type { ResolvedTemplate } from '@/lib/email/templates-defs'
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
  const [pending, start] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<PipelineStageId | null>(null)
  // GUIC-647 — sélection multiple pour les actions groupées.
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set())
  const [stageCible, setStageCible] = useState<PipelineStageId>('Preselection')

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

  function toggleSel(id: string) {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  /** « Tout sélectionner » de colonne : coche tout, ou décoche tout si déjà tout coché. */
  function toggleColonne(cards: PipelineCard[]) {
    setSel((prev) => {
      const next = new Set(prev)
      const tous = cards.length > 0 && cards.every((c) => next.has(c.id))
      for (const c of cards) { if (tous) next.delete(c.id); else next.add(c.id) }
      return next
    })
  }
  function groupe(fn: (ids: string[]) => Promise<unknown>) {
    const ids = [...sel]
    if (ids.length === 0) return
    start(async () => {
      try { await fn(ids); setSel(new Set()); router.refresh() } catch { /* noop */ }
    })
  }
  function refuserGroupe() {
    if (!window.confirm(`Refuser ${sel.size} candidature${sel.size > 1 ? 's' : ''} ? Les candidats seront notifiés.`)) return
    groupe((ids) => changerStatutGroupe(ids, 'Refusee'))
  }

  // GUIC-553 évolution — envoi groupé d'un modèle d'email aux candidatures sélectionnées.
  const [mailOuvert, setMailOuvert] = useState(false)
  const [modeles, setModeles] = useState<ResolvedTemplate[] | null>(null)
  const [cleModele, setCleModele] = useState('pipeline.preselection')
  const [complement, setComplement] = useState('')

  function ouvrirMail() {
    setMailOuvert(true)
    if (!modeles) {
      listMesTemplates().then(setModeles).catch(() => setModeles([]))
    }
  }
  function envoyerMail() {
    const ids = [...sel]
    if (ids.length === 0) return
    start(async () => {
      try {
        const res = await envoyerEmailGroupe(ids, cleModele, complement)
        window.alert(`Emails : ${res.envoyes} envoyé${res.envoyes > 1 ? 's' : ''}, ${res.sansEmail} sans adresse, ${res.echecs} échec${res.echecs > 1 ? 's' : ''}.`)
        setMailOuvert(false); setComplement(''); setSel(new Set()); router.refresh()
      } catch (err) {
        window.alert(err instanceof Error && err.message.includes('NOTIFICATIONS_DISABLED')
          ? 'Envois désactivés (NOTIFICATIONS_ENABLED).'
          : 'Échec de l’envoi groupé.')
      }
    })
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
            const toutesCochees = cards.length > 0 && cards.every((c) => sel.has(c.id))
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
                  {cards.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleColonne(cards)}
                      aria-label={toutesCochees ? `Tout désélectionner dans ${col.label}` : `Tout sélectionner dans ${col.label}`}
                      className="text-[10.5px] font-black border-0 rounded-[7px] px-[8px] min-h-[24px]"
                      style={{ background: toutesCochees ? 'var(--gj-blue, #1A4ED8)' : '#fff', color: toutesCochees ? '#fff' : 'var(--gj-grey)', cursor: 'pointer' }}
                    >
                      Tout
                    </button>
                  )}
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {cards.length === 0 && <p className="text-[12px] text-center py-[10px]" style={{ color: 'var(--gj-grey)' }}>—</p>}
                  {cards.map((c) => (
                    <Card
                      key={c.id}
                      c={c}
                      selected={sel.has(c.id)}
                      onToggleSel={() => toggleSel(c.id)}
                      onDragStart={() => setDragId(c.id)}
                      onFav={(e) => fav(e, c.id)}
                      onMove={(stage) => move(c.id, stage)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* GUIC-647 — barre d'actions groupées (au-dessus de la bottom-nav mobile 64px) */}
      {sel.size > 0 && (
        <div
          role="toolbar"
          aria-label="Actions groupées"
          className="fixed left-[12px] right-[12px] bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-[24px] z-40 flex items-center gap-[8px] flex-wrap rounded-[14px] px-[14px] py-[10px]"
          style={{ background: 'var(--gj-ink, #101828)', color: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,.28)' }}
        >
          <span className="text-[12.5px] font-black whitespace-nowrap">{sel.size} sélectionné{sel.size > 1 ? 's' : ''}</span>
          <span aria-hidden style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.22)' }} />
          <label className="inline-flex items-center gap-[6px] text-[12px] font-bold">
            <span className="sr-only">Étape cible</span>
            <select
              value={stageCible}
              onChange={(e) => setStageCible(e.target.value as PipelineStageId)}
              className="rounded-[8px] border-0 px-[8px] min-h-[34px] text-[12px]"
              style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
            >
              {COLS.map((c) => <option key={c.id} value={c.id} style={{ color: 'var(--gj-ink)' }}>{c.label}</option>)}
            </select>
          </label>
          <button type="button" disabled={pending} onClick={() => groupe((ids) => deplacerPipelineGroupe(ids, stageCible))} className="inline-flex items-center gap-[5px] text-[12px] font-black rounded-[8px] px-[10px] min-h-[34px] border-0" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', cursor: 'pointer' }}>
            <Icon name="arrow-right" size={12} /> Déplacer
          </button>
          <button type="button" disabled={pending} onClick={() => groupe((ids) => changerStatutGroupe(ids, 'Retenue'))} className="inline-flex items-center gap-[5px] text-[12px] font-black rounded-[8px] px-[10px] min-h-[34px] border-0" style={{ background: 'var(--gj-green, #16A34A)', color: '#fff', cursor: 'pointer' }}>
            <Icon name="check-circle" size={12} /> Retenir
          </button>
          <button type="button" disabled={pending} onClick={refuserGroupe} className="inline-flex items-center gap-[5px] text-[12px] font-black rounded-[8px] px-[10px] min-h-[34px] border-0" style={{ background: 'var(--gj-red, #DC2626)', color: '#fff', cursor: 'pointer' }}>
            <Icon name="close" size={12} /> Refuser
          </button>
          <button type="button" disabled={pending} onClick={() => groupe((ids) => basculerFavoriGroupe(ids, true))} className="inline-flex items-center gap-[5px] text-[12px] font-black rounded-[8px] px-[10px] min-h-[34px] border-0" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer' }}>
            <Icon name="bookmark" size={12} /> Favori
          </button>
          <button type="button" disabled={pending} onClick={ouvrirMail} className="inline-flex items-center gap-[5px] text-[12px] font-black rounded-[8px] px-[10px] min-h-[34px] border-0" style={{ background: 'var(--gj-teal, #0FA88F)', color: '#fff', cursor: 'pointer' }}>
            <Icon name="chat" size={12} /> Email
          </button>
          <button type="button" onClick={() => setSel(new Set())} aria-label="Effacer la sélection" className="inline-flex items-center text-[12px] font-bold rounded-[8px] px-[8px] min-h-[34px] border-0" style={{ background: 'transparent', color: 'rgba(255,255,255,.75)', cursor: 'pointer' }}>
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      {/* GUIC-553 évolution — modale d'envoi groupé d'un modèle d'email */}
      {mailOuvert && (
        <div role="dialog" aria-modal="true" aria-label="Envoyer un email aux candidats sélectionnés" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(16,24,40,.55)' }} onClick={() => setMailOuvert(false)}>
          <div className="w-full max-w-[520px] rounded-[14px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-[16px] font-black" style={{ color: 'var(--gj-ink)' }}>
              Envoyer un email — {sel.size} candidat{sel.size > 1 ? 's' : ''}
            </div>
            <label className="mt-4 block text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Modèle
              <select
                value={cleModele}
                onChange={(e) => setCleModele(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-[1.5px] px-3 min-h-[40px] text-[13px] bg-white"
                style={{ borderColor: 'var(--gj-line)', color: 'var(--gj-ink)' }}
              >
                {(modeles ?? []).map((m) => <option key={m.cle} value={m.cle}>{m.nom}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Complément (injecté dans le modèle — date, lieu, précisions…)
              <textarea
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[10px] border-[1.5px] px-3 py-2 text-[13px]"
                style={{ borderColor: 'var(--gj-line)', color: 'var(--gj-ink)' }}
              />
            </label>
            <p className="mt-2 text-[11.5px]" style={{ color: 'var(--gj-grey)' }}>
              Vous pouvez ajuster vos modèles dans « Modèles d’emails ». Chaque envoi est tracé.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setMailOuvert(false)} className="rounded-[10px] border-[1.5px] px-4 min-h-[40px] text-[13px] font-extrabold bg-white" style={{ borderColor: 'var(--gj-line)', color: 'var(--gj-ink)', cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="button" disabled={pending || !modeles} onClick={envoyerMail} className="rounded-[10px] border-0 px-4 min-h-[40px] text-[13px] font-extrabold" style={{ background: 'var(--gj-teal-deep, #0B7285)', color: '#fff', cursor: 'pointer' }}>
                {pending ? 'Envoi…' : `Envoyer (${sel.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ c, selected, onToggleSel, onDragStart, onFav, onMove }: {
  c: PipelineCard
  selected: boolean
  onToggleSel: () => void
  onDragStart: () => void
  onFav: (e: React.MouseEvent) => void
  onMove: (stage: PipelineStageId) => void
}) {
  const idx = COLS.findIndex((cc) => cc.id === c.stage)
  const prev = idx > 0 ? COLS[idx - 1] : null
  const next = idx < COLS.length - 1 ? COLS[idx + 1] : null
  const arrow = (e: React.MouseEvent, stage: PipelineStageId) => { e.preventDefault(); e.stopPropagation(); onMove(stage) }
  const cocher = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onToggleSel() }
  return (
    <a
      href={`/recruteur/candidatures/${c.id}`}
      draggable
      onDragStart={onDragStart}
      className="no-underline"
      style={{ background: '#fff', border: `1.5px solid ${selected ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-line)'}`, borderRadius: 11, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* GUIC-647 — case de sélection groupée (ne navigue pas). */}
        <input
          type="checkbox"
          checked={selected}
          readOnly
          onClick={cocher}
          aria-label={`Sélectionner ${c.prenom} ${c.nom}`}
          style={{ width: 16, height: 16, flexShrink: 0, accentColor: 'var(--gj-blue, #1A4ED8)', cursor: 'pointer' }}
        />
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
        {c.match != null ? (
          <span
            className="inline-flex items-center gap-[3px] text-[10px] font-black"
            style={{ ...matchStyle(c.match), padding: '2px 8px', borderRadius: 999 }}
            title={c.matchRaison ?? 'Score calculé par l’IA (CV + profil vs offre)'}
            aria-label={`Score IA ${c.match} sur 100${c.matchRaison ? ` — ${c.matchRaison}` : ''}`}
          >
            <Icon name="bolt" size={10} /> IA {c.match}
          </span>
        ) : <span className="text-[10px]" style={{ color: 'var(--gj-grey)' }}>—</span>}
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
