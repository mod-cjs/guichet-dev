'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { rechercherUtilisateursPourRattachement, type UtilisateurRattachable } from '../actions'
import { ajouterRattachementCentre, retirerRattachementCentre } from '../../utilisateurs/actions'

export interface CentreAgent { id: string; cjsUid: string; nom: string; role: string }

const ROLE_LABEL: Record<string, string> = { conseiller: 'Conseiller', directeur: 'Directeur', admin_centre: 'Admin centre' }
const ROLE_OPTS = [
  { value: 'conseiller', label: 'Conseiller' },
  { value: 'directeur', label: 'Directeur' },
  { value: 'admin_centre', label: 'Admin centre' },
]

function initials(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
}

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }
const av: CSSProperties = { width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', color: 'var(--gj-yellow-ink)' }
// Boutons d'action maquette (.ab / .ab.ok)
const AB: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 13px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer', border: '1px solid var(--gj-line-strong)', background: 'transparent', color: 'var(--gj-ink)' }
const AB_OK: CSSProperties = { ...AB, border: '1px solid transparent', background: 'var(--gj-green-ink)', color: 'var(--gj-admin-on-gold)' }

function H6({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>
      <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }} />
      {children}
    </div>
  )
}

const FIELD = 'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[9px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)]'

/**
 * Onglet Équipe & accès (GUIC-687) — fidèle maquette cTeam : carte « Agents rattachés »
 * (liste seule) → 2 boutons sous la carte (Ajouter un conseiller / Gérer le multi-centre)
 * → carte Note. Ajout = recherche inline ; Gérer = mode gestion (retrait par agent).
 */
export function CentreEquipe({ centreId, staffCount, agents }: { centreId: string; staffCount: number; agents: CentreAgent[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState(false)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('conseiller')
  const [results, setResults] = useState<UtilisateurRattachable[]>([])
  const [searching, setSearching] = useState(false)

  function notify(msg: string, variant: ToastVariant) { setToast({ msg, variant }) }

  function toggleAdd() { setAdding((v) => !v); setManaging(false); setQ(''); setResults([]) }
  function toggleManage() { setManaging((v) => !v); setAdding(false) }

  function search(value: string) {
    setQ(value)
    if (value.trim().length < 2) { setResults([]); return }
    setSearching(true)
    startTransition(async () => {
      try { setResults(await rechercherUtilisateursPourRattachement(centreId, value)) }
      catch { setResults([]) }
      finally { setSearching(false) }
    })
  }

  function attach(u: UtilisateurRattachable) {
    startTransition(async () => {
      const res = await ajouterRattachementCentre({ cjsUid: u.cjsUid, centreId, role })
      if (res.ok) { notify(`${u.nom} rattaché·e comme ${ROLE_LABEL[role] ?? role}.`, 'success'); setQ(''); setResults([]); setAdding(false); router.refresh() }
      else notify(res.error === 'DEJA_RATTACHE' ? 'Déjà rattaché·e à ce centre.' : 'Rattachement impossible.', 'danger')
    })
  }

  function detach(a: CentreAgent) {
    if (!window.confirm(`Retirer ${a.nom} de ce centre ?`)) return
    startTransition(async () => {
      const res = await retirerRattachementCentre(a.id)
      if (res.ok) { notify(`${a.nom} retiré·e du centre.`, 'success'); router.refresh() }
      else notify('Retrait impossible.', 'danger')
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Carte : liste des agents (fidèle maquette — pas d'action dans la carte) */}
      <div style={card}>
        <H6>Agents rattachés · {staffCount}</H6>
        {agents.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun agent rattaché à ce centre.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agents.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span aria-hidden style={av}>{initials(a.nom)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ fontSize: 13, color: 'var(--gj-ink)', display: 'block' }}>{a.nom}</b>
                  <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', display: 'block' }}>{ROLE_LABEL[a.role] ?? a.role}</span>
                </div>
                {managing && (
                  <button type="button" aria-label={`Retirer ${a.nom}`} disabled={pending} onClick={() => detach(a)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--gj-red)', background: 'transparent', color: 'var(--gj-red-ink)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            ))}
            {staffCount > agents.length && (
              <div style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 4 }}>+ {staffCount - agents.length} autres agents rattachés</div>
            )}
          </div>
        )}
      </div>

      {/* 2 boutons SOUS la carte (maquette) */}
      <div style={{ display: 'flex', gap: 9, marginTop: -6 }}>
        <button type="button" onClick={toggleAdd} style={adding ? AB : AB_OK}>
          <Icon name={adding ? 'close' : 'plus'} size={15} /> {adding ? 'Fermer' : 'Ajouter un conseiller'}
        </button>
        <button type="button" onClick={toggleManage} style={managing ? { ...AB, borderColor: 'var(--gj-grey)', color: 'var(--gj-ink)' } : AB}>
          <Icon name={managing ? 'check' : 'settings'} size={15} /> {managing ? 'Terminé' : 'Gérer le multi-centre'}
        </button>
      </div>

      {/* Panneau de recherche (déplié par « Ajouter un conseiller ») */}
      {adding && (
        <div style={{ padding: 14, borderRadius: 11, background: 'var(--gj-surface)', border: '1px solid var(--gj-line)' }}>
          <div className="grid grid-cols-[1fr_180px] gap-[10px]">
            <input className={FIELD} placeholder="Rechercher un utilisateur (nom, e-mail)…" value={q} onChange={(e) => search(e.target.value)} aria-label="Rechercher un utilisateur" />
            <select className={FIELD} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rôle">
              {ROLE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searching && <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: 0 }}>Recherche…</p>}
            {!searching && q.trim().length >= 2 && results.length === 0 && <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: 0 }}>Aucun utilisateur trouvé (ou déjà rattaché).</p>}
            {results.map((u) => (
              <button key={u.cjsUid} type="button" disabled={pending} onClick={() => attach(u)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 9, background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', cursor: 'pointer', textAlign: 'left', opacity: pending ? 0.6 : 1 }}>
                <span aria-hidden style={av}>{initials(u.nom)}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ fontSize: 13, color: 'var(--gj-ink)', display: 'block' }}>{u.nom}</b>
                  <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.sousTitre}</span>
                </span>
                <Icon name="plus" size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Carte Note (maquette) */}
      <div style={card}>
        <H6>Note</H6>
        <p style={{ fontSize: 12.5, color: 'var(--gj-grey)', margin: 0, lineHeight: 1.55 }}>
          Un conseiller peut être rattaché à plusieurs centres et basculer via le sélecteur de centre actif.
          Les rôles (conseiller / directeur / admin centre) sont posés côté SSO.
        </p>
      </div>

      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
