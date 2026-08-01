'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { PageInfo } from '@/lib/centre-pagination'
import { CentreSearch } from './CentreSearch'
import { CentrePager } from './CentrePager'
import { EvenementFormModal, type EvenementFormValues } from '../../evenements/EvenementFormModal'
import { supprimerEvenement, validerPublication, refuserPublication } from '../../evenements/actions'

export interface EvenementRow {
  id: string
  jour: string
  mois: string
  titre: string
  inscrits: number
  capacite: number | null
  statut: string
  edit: EvenementFormValues
}

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }
const mini: CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--gj-line)', background: 'transparent', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }
const outlineBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: 'var(--gj-ink)', border: '1px solid var(--gj-line-strong)' }
const abOk: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: '1px solid transparent', background: 'var(--gj-green-ink)', color: 'var(--gj-admin-on-gold)' }
const abNo: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: '1px solid var(--gj-red)', background: 'transparent', color: 'var(--gj-red-ink)' }

const STATUT_EV: Record<string, { label: string; bg: string; fg: string }> = {
  a_venir: { label: 'À venir', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  en_cours: { label: 'En cours', bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' },
  termine: { label: 'Terminé', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
  annule: { label: 'Annulé', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  en_relecture: { label: 'En relecture', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  refuse: { label: 'Refusé', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
}

function H6({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>
      <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }} />
      {children}
    </div>
  )
}

/**
 * Liste des événements du centre ACTIONNABLE (GUIC-687) — l'admin a la main :
 * créer (pré-verrouillé sur ce centre), éditer, supprimer, et modérer les publications
 * conseiller en relecture (valider/refuser). Réutilise le module admin/evenements
 * (actions + EvenementFormModal). Émargement via la fiche événement (lien).
 */
export function CentreEvenementsList({ centreId, centreNom, evenements, info }: { centreId: string; centreNom: string; evenements: EvenementRow[]; info: PageInfo }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; ev?: EvenementFormValues } | null>(null)

  const centres = [{ id: centreId, nom: centreNom }]
  function notify(msg: string, variant: ToastVariant) { setToast({ msg, variant }) }

  function run(fn: () => Promise<unknown>, ok: string, onErr: (msg: string) => string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    startTransition(async () => {
      try { await fn(); notify(ok, 'success'); router.refresh() }
      catch (e) { notify(onErr(e instanceof Error ? e.message : ''), 'danger') }
    })
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}><H6>Événements du centre</H6></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <CentreSearch prefix="ev" placeholder="Rechercher un événement…" label="Rechercher un événement" />
          <button type="button" onClick={() => setModal({ mode: 'create', ev: { centreId } })} style={outlineBtn}><Icon name="plus" size={15} /> Nouvel événement</button>
        </div>
      </div>

      {evenements.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun événement{info.total === 0 ? ' pour ce centre' : ' pour cette recherche'}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {evenements.map((e) => {
            const v = STATUT_EV[e.statut] ?? STATUT_EV.termine
            const pct = e.capacite && e.capacite > 0 ? Math.min(100, Math.round((e.inscrits / e.capacite) * 100)) : 0
            const enRelecture = e.statut === 'en_relecture'
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 15, alignItems: 'center', background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ width: 52, textAlign: 'center', borderRight: '1px solid var(--gj-line)', paddingRight: 15 }}>
                  <b style={{ fontSize: 21, fontWeight: 900, display: 'block', lineHeight: 1, color: 'var(--gj-ink)' }}>{e.jour}</b>
                  <span style={{ fontSize: 11, color: 'var(--gj-grey)', fontWeight: 700 }}>{e.mois}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)' }}>{e.titre}</b>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap', background: v.bg, color: v.fg }}>{v.label}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 3 }}>{e.inscrits}{e.capacite ? ` / ${e.capacite}` : ''} inscrits</div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden', maxWidth: 200, marginTop: 6 }}>
                    <span aria-hidden style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--gj-admin-gold)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {enRelecture && (
                    <>
                      <button type="button" disabled={pending} style={abOk} onClick={() => run(() => validerPublication(e.id), 'Publication validée.', () => 'Validation impossible.')}>
                        <Icon name="check" size={13} /> Valider
                      </button>
                      <button type="button" disabled={pending} style={abNo} onClick={() => run(() => refuserPublication(e.id), 'Publication refusée.', () => 'Refus impossible.', `Refuser « ${e.titre} » ?`)}>
                        <Icon name="close" size={13} /> Refuser
                      </button>
                    </>
                  )}
                  <Link href={`/admin/evenements/${e.id}`} aria-label={`Ouvrir la fiche de ${e.titre}`} title="Ouvrir la fiche (émargement, détail)" style={{ ...mini, textDecoration: 'none' }}><Icon name="chevron-right" size={15} /></Link>
                  <button type="button" aria-label={`Éditer ${e.titre}`} onClick={() => setModal({ mode: 'edit', ev: e.edit })} style={mini}><Icon name="settings" size={14} /></button>
                  <button type="button" aria-label={`Supprimer ${e.titre}`} disabled={pending} style={{ ...mini, color: 'var(--gj-red-ink)', borderColor: 'var(--gj-red)' }}
                    onClick={() => run(() => supprimerEvenement(e.id), 'Événement supprimé.', (m) => m === 'EVENEMENT_AVEC_INSCRITS' ? 'Impossible : des jeunes sont inscrits. Annulez-le plutôt.' : 'Suppression impossible.', `Supprimer « ${e.titre} » ?`)}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CentrePager prefix="ev" info={info} label="événements" />

      {modal && (
        <EvenementFormModal
          isOpen
          onClose={() => setModal(null)}
          evenement={modal.ev}
          centres={centres}
          onSuccess={(action) => { setModal(null); notify(action === 'create' ? 'Événement créé.' : 'Événement mis à jour.', 'success'); router.refresh() }}
        />
      )}
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
