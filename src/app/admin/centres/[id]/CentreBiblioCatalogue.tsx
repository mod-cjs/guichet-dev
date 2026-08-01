'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import {
  creerLivreCentre, modifierLivreCentre, supprimerLivreCentre,
  ajouterExemplaireCentre, modifierExemplaireCentre, supprimerExemplaireCentre,
} from './biblio-actions'

export interface CatalogueExemplaire { id: string; codeBarre: string; rayon: string; etagere: string; position: string; statut: string }
export interface CatalogueLivre {
  id: string; titre: string; auteur: string; theme: string
  isbn: string | null; niveau: string | null; langue: string; resume: string | null
  exemplaires: CatalogueExemplaire[]
}

const FIELD = 'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[9px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)]'
const LABEL = 'block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-color-text-muted mb-[6px]'
const SEARCH = 'rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[8px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)] w-full max-w-[260px]'
const mini: CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--gj-line)', background: 'transparent', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }
const outlineBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: 'var(--gj-ink)', border: '1px solid var(--gj-line-strong)' }

const STATUT_EX: Record<string, { label: string; bg: string; fg: string }> = {
  disponible: { label: 'Disponible', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  emprunte: { label: 'Emprunté', bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' },
  reserve: { label: 'Réservé', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  indisponible: { label: 'Indisponible', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span className={LABEL}>{label}</span>{children}</div>
}

interface LivreForm { titre: string; auteur: string; theme: string; isbn: string; niveau: string; langue: string; resume: string }
function emptyLivre(): LivreForm { return { titre: '', auteur: '', theme: '', isbn: '', niveau: '', langue: 'fr', resume: '' } }
function toForm(l: CatalogueLivre): LivreForm { return { titre: l.titre, auteur: l.auteur, theme: l.theme, isbn: l.isbn ?? '', niveau: l.niveau ?? '', langue: l.langue, resume: l.resume ?? '' } }

/**
 * Gestion du catalogue + fonds d'un centre (GUIC-687) — l'admin gère les LIVRES et les
 * EXEMPLAIRES du centre. Le comptoir (retrait/retour) reste au staff/conseiller (via QR).
 */
export function CentreBiblioCatalogue({ centreId, livres }: { centreId: string; livres: CatalogueLivre[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; livre?: CatalogueLivre } | null>(null)
  const [form, setForm] = useState<LivreForm>(emptyLivre())
  // 1er exemplaire optionnel à la création
  const [firstEx, setFirstEx] = useState({ codeBarre: '', rayon: '', etagere: '', position: '' })
  const [formErr, setFormErr] = useState<string | null>(null)

  const view = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s === '' ? livres : livres.filter((l) => `${l.titre} ${l.auteur} ${l.theme} ${l.isbn ?? ''}`.toLowerCase().includes(s))
  }, [q, livres])

  function notify(msg: string, variant: ToastVariant) { setToast({ msg, variant }) }
  function fail(code?: string) {
    notify(code === 'DUPLICATE_CODE_BARRE' ? 'Code-barres déjà utilisé.' : code === 'FORBIDDEN' ? 'Action réservée aux administrateurs.' : 'Action impossible.', 'danger')
  }

  function openCreate() { setForm(emptyLivre()); setFirstEx({ codeBarre: '', rayon: '', etagere: '', position: '' }); setFormErr(null); setModal({ mode: 'create' }) }
  function openEdit(l: CatalogueLivre) { setForm(toForm(l)); setFormErr(null); setModal({ mode: 'edit', livre: l }) }

  function submitLivre(e: React.FormEvent) {
    e.preventDefault()
    setFormErr(null)
    if (!form.titre.trim() || !form.auteur.trim() || !form.theme.trim()) { setFormErr('Titre, auteur et thème sont requis.'); return }
    const livre = { titre: form.titre, auteur: form.auteur, theme: form.theme, isbn: form.isbn || null, niveau: form.niveau || null, langue: form.langue || 'fr', resume: form.resume || null }
    startTransition(async () => {
      if (modal?.mode === 'edit' && modal.livre) {
        const r = await modifierLivreCentre(centreId, modal.livre.id, livre)
        if (r.ok) { notify('Livre mis à jour.', 'success'); setModal(null); router.refresh() } else fail(r.error)
      } else {
        const hasEx = firstEx.codeBarre.trim() && firstEx.rayon.trim() && firstEx.etagere.trim() && firstEx.position.trim()
        const r = await creerLivreCentre(centreId, livre, hasEx ? firstEx : undefined)
        if (r.ok) { notify('Livre ajouté au catalogue.', 'success'); setModal(null); router.refresh() } else fail(r.error)
      }
    })
  }

  function removeLivre(l: CatalogueLivre) {
    if (!window.confirm(`Supprimer « ${l.titre} » et ses ${l.exemplaires.length} exemplaire(s) ? Action irréversible.`)) return
    startTransition(async () => {
      const r = await supprimerLivreCentre(centreId, l.id)
      if (r.ok) { notify('Livre supprimé.', 'success'); router.refresh() } else fail(r.error)
    })
  }

  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h6 style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flexShrink: 0 }} />
          Catalogue &amp; fonds · {livres.length} titre{livres.length > 1 ? 's' : ''}
        </h6>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className={SEARCH} placeholder="Rechercher un titre, un auteur…" aria-label="Rechercher un livre" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" onClick={openCreate} style={outlineBtn}><Icon name="plus" size={15} /> Ajouter un livre</button>
        </div>
      </div>

      {view.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>{livres.length === 0 ? 'Aucun livre dans le fonds de ce centre. Ajoutez un titre pour démarrer.' : 'Aucun livre pour cette recherche.'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {view.map((l) => {
            const dispo = l.exemplaires.filter((e) => e.statut === 'disponible').length
            const open = openId === l.id
            return (
              <div key={l.id} style={{ border: '1px solid var(--gj-line)', borderRadius: 11, background: 'var(--gj-bg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                  <button type="button" onClick={() => setOpenId(open ? null : l.id)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 0, cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left', padding: 0 }}>
                    <span aria-hidden style={{ transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'none', fontSize: 15, color: 'var(--gj-grey)' }}>›</span>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 13.5, color: 'var(--gj-ink)', display: 'block' }}>{l.titre}</b>
                      <span style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>{l.auteur} · {l.theme}{l.isbn ? ` · ISBN ${l.isbn}` : ''}</span>
                    </span>
                  </button>
                  <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', whiteSpace: 'nowrap' }}><b style={{ color: 'var(--gj-ink)' }}>{l.exemplaires.length}</b> ex. · {dispo} dispo</span>
                  <button type="button" aria-label={`Éditer ${l.titre}`} onClick={() => openEdit(l)} style={mini}><Icon name="settings" size={14} /></button>
                  <button type="button" aria-label={`Supprimer ${l.titre}`} disabled={pending} onClick={() => removeLivre(l)} style={{ ...mini, color: 'var(--gj-red-ink)', borderColor: 'var(--gj-red)' }}><Icon name="close" size={14} /></button>
                </div>
                {open && <ExemplairesManager centreId={centreId} livre={l} pending={pending} run={startTransition} notify={notify} fail={fail} refresh={() => router.refresh()} />}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 12, marginBottom: 0 }}>
        Le comptoir (retrait / retour) se fait au centre par le staff, via scan du QR badge.
      </p>

      {modal && (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={modal.mode === 'edit' ? 'Modifier le livre' : 'Ajouter un livre'}
          maxWidth="max-w-[560px]"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={pending} className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)] hover:!text-color-text-primary">Annuler</Button>
              <Button type="submit" form="livre-form" variant="primary" disabled={pending} className="!bg-[var(--gj-admin-gold)] !text-[color:var(--gj-admin-on-gold)] hover:!opacity-90">{modal.mode === 'edit' ? 'Enregistrer' : 'Ajouter'}</Button>
            </>
          }
        >
          <form id="livre-form" onSubmit={submitLivre} className="flex flex-col gap-[14px]">
            <Fld label="Titre"><input className={FIELD} required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></Fld>
            <div className="grid grid-cols-2 gap-[12px]">
              <Fld label="Auteur"><input className={FIELD} required value={form.auteur} onChange={(e) => setForm({ ...form, auteur: e.target.value })} /></Fld>
              <Fld label="Thème"><input className={FIELD} required value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></Fld>
            </div>
            <div className="grid grid-cols-3 gap-[12px]">
              <Fld label="ISBN"><input className={FIELD} value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></Fld>
              <Fld label="Niveau"><input className={FIELD} value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} /></Fld>
              <Fld label="Langue"><input className={FIELD} value={form.langue} onChange={(e) => setForm({ ...form, langue: e.target.value })} /></Fld>
            </div>
            <Fld label="Résumé"><textarea className={`${FIELD} min-h-[70px]`} value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })} /></Fld>

            {modal.mode === 'create' && (
              <div style={{ borderTop: '1px solid var(--gj-line)', paddingTop: 12 }}>
                <span className={LABEL}>Premier exemplaire dans ce centre (optionnel)</span>
                <div className="grid grid-cols-2 gap-[10px]">
                  <input className={FIELD} placeholder="Code-barres" value={firstEx.codeBarre} onChange={(e) => setFirstEx({ ...firstEx, codeBarre: e.target.value })} aria-label="Code-barres" />
                  <input className={FIELD} placeholder="Rayon" value={firstEx.rayon} onChange={(e) => setFirstEx({ ...firstEx, rayon: e.target.value })} aria-label="Rayon" />
                  <input className={FIELD} placeholder="Étagère" value={firstEx.etagere} onChange={(e) => setFirstEx({ ...firstEx, etagere: e.target.value })} aria-label="Étagère" />
                  <input className={FIELD} placeholder="Position" value={firstEx.position} onChange={(e) => setFirstEx({ ...firstEx, position: e.target.value })} aria-label="Position" />
                </div>
                <p style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 6, marginBottom: 0 }}>Laissez vide pour n&apos;ajouter que le titre ; vous pourrez placer des exemplaires ensuite.</p>
              </div>
            )}
            {formErr && <p role="alert" className="text-fs-200 text-gj-red font-bold">{formErr}</p>}
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}

function ExemplairesManager({ centreId, livre, pending, run, notify, fail, refresh }: {
  centreId: string; livre: CatalogueLivre; pending: boolean
  run: (cb: () => void) => void
  notify: (m: string, v: ToastVariant) => void
  fail: (code?: string) => void
  refresh: () => void
}) {
  const [add, setAdd] = useState({ codeBarre: '', rayon: '', etagere: '', position: '' })
  const [adding, setAdding] = useState(false)

  const th: CSSProperties = { textAlign: 'left', fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey)', padding: '0 10px 8px' }
  const cell: CSSProperties = { padding: '9px 10px', borderTop: '1px solid var(--gj-line)', fontSize: 12.5, color: 'var(--gj-grey)' }

  function submitAdd() {
    if (!add.codeBarre.trim() || !add.rayon.trim() || !add.etagere.trim() || !add.position.trim()) { notify('Code-barres et emplacement complets requis.', 'danger'); return }
    run(async () => {
      const r = await ajouterExemplaireCentre(centreId, livre.id, add)
      if (r.ok) { notify('Exemplaire ajouté.', 'success'); setAdd({ codeBarre: '', rayon: '', etagere: '', position: '' }); setAdding(false); refresh() } else fail(r.error)
    })
  }
  function toggleDispo(ex: CatalogueExemplaire) {
    const next = ex.statut === 'indisponible' ? 'disponible' : 'indisponible'
    run(async () => {
      const r = await modifierExemplaireCentre(centreId, ex.id, { statut: next })
      if (r.ok) { notify(next === 'disponible' ? 'Exemplaire remis en service.' : 'Exemplaire mis hors service.', 'success'); refresh() } else fail(r.error)
    })
  }
  function remove(ex: CatalogueExemplaire) {
    if (!window.confirm(`Retirer l'exemplaire ${ex.codeBarre} du fonds ?`)) return
    run(async () => {
      const r = await supprimerExemplaireCentre(centreId, ex.id)
      if (r.ok) { notify('Exemplaire retiré.', 'success'); refresh() } else fail(r.error)
    })
  }

  return (
    <div style={{ borderTop: '1px solid var(--gj-line)', padding: '12px 14px', background: 'var(--gj-surface)' }}>
      {livre.exemplaires.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--gj-grey)', margin: '0 0 10px' }}>Aucun exemplaire dans ce centre pour ce titre.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead><tr>{['Code-barres', 'Emplacement', 'Statut', ''].map((h, k) => <th key={h || `c${k}`} style={{ ...th, textAlign: k === 3 ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {livre.exemplaires.map((ex) => {
                const v = STATUT_EX[ex.statut] ?? STATUT_EX.indisponible
                const emprunteOuReserve = ex.statut === 'emprunte' || ex.statut === 'reserve'
                return (
                  <tr key={ex.id}>
                    <td style={{ ...cell, color: 'var(--gj-ink)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{ex.codeBarre}</td>
                    <td style={cell}>{ex.rayon} · {ex.etagere} · {ex.position}</td>
                    <td style={cell}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: v.bg, color: v.fg, whiteSpace: 'nowrap' }}>{v.label}</span></td>
                    <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" disabled={pending || emprunteOuReserve} title={emprunteOuReserve ? 'Exemplaire en circulation' : (ex.statut === 'indisponible' ? 'Remettre en service' : 'Mettre hors service')} onClick={() => toggleDispo(ex)} style={{ ...mini, display: 'inline-grid', marginRight: 6, opacity: emprunteOuReserve ? 0.4 : 1 }}>
                        <Icon name={ex.statut === 'indisponible' ? 'eye' : 'eye-off'} size={13} />
                      </button>
                      <button type="button" disabled={pending || emprunteOuReserve} title={emprunteOuReserve ? 'Impossible : en circulation' : 'Retirer'} onClick={() => remove(ex)} style={{ ...mini, display: 'inline-grid', color: 'var(--gj-red-ink)', borderColor: 'var(--gj-red)', opacity: emprunteOuReserve ? 0.4 : 1 }}>
                        <Icon name="close" size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding ? (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, alignItems: 'center' }}>
          <input className={FIELD} placeholder="Code-barres" value={add.codeBarre} onChange={(e) => setAdd({ ...add, codeBarre: e.target.value })} aria-label="Code-barres du nouvel exemplaire" />
          <input className={FIELD} placeholder="Rayon" value={add.rayon} onChange={(e) => setAdd({ ...add, rayon: e.target.value })} aria-label="Rayon" />
          <input className={FIELD} placeholder="Étagère" value={add.etagere} onChange={(e) => setAdd({ ...add, etagere: e.target.value })} aria-label="Étagère" />
          <input className={FIELD} placeholder="Position" value={add.position} onChange={(e) => setAdd({ ...add, position: e.target.value })} aria-label="Position" />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" disabled={pending} onClick={submitAdd} style={{ padding: '9px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', border: 0, background: 'var(--gj-admin-gold)', color: 'var(--gj-admin-on-gold)' }}>Ajouter</button>
            <button type="button" onClick={() => setAdding(false)} style={mini}><Icon name="close" size={14} /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{ ...outlineBtn, marginTop: 10, padding: '7px 12px', fontSize: 12 }}><Icon name="plus" size={14} /> Ajouter un exemplaire</button>
      )}
    </div>
  )
}
