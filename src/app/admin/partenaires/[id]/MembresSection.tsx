'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { changerStatutMembre } from '@/app/admin/partenaires/actions'
import { RattacherMembreModal } from './RattacherMembreModal'

export interface MembreVM {
  id: string
  cjsUid: string
  nom: string
  contact: string
  role: 'titulaire' | 'recruteur'
  statut: 'actif' | 'revoke'
  personneStatut: string
}

const ROLE_LABEL: Record<MembreVM['role'], string> = { titulaire: 'Titulaire', recruteur: 'Recruteur' }
const PERSONNE_LABEL: Record<string, string> = { actif: 'Compte actif', inactif: 'Compte suspendu', anonymise: 'Anonymisé' }

/**
 * GUIC-706 (Phase 2b) — Membres (0..N) d'un partenaire. Remplace l'ancienne section
 * « Compte recruteur » (1:1). Chaque membre : rôle (titulaire/recruteur), statut membre
 * (actif/révoqué) avec bascule Révoquer/Réactiver, + statut de la personne (lecture — géré
 * dans Utilisateurs). Rattacher un membre = recherche d'un utilisateur existant.
 */
export function MembresSection({ organisationId, membres }: { organisationId: string; membres: MembreVM[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  function basculer(m: MembreVM) {
    const cible = m.statut === 'actif' ? 'revoke' : 'actif'
    startTransition(async () => {
      try {
        await changerStatutMembre(m.id, cible)
        setMsg({ text: cible === 'revoke' ? `${m.nom} révoqué·e.` : `${m.nom} réactivé·e.`, ok: true })
        router.refresh()
      } catch {
        setMsg({ text: 'Action impossible.', ok: false })
      }
    })
  }

  return (
    <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-[12px]">
        <h2 className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>Membres ({membres.length})</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[12px] py-[7px] min-h-[36px]"
          style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 'none' }}
        >
          <Icon name="plus" size={14} /> Rattacher un membre
        </button>
      </div>

      {msg && (
        <p className="text-[12.5px] font-bold mb-[10px]" style={{ color: msg.ok ? 'var(--gj-green-ink, #1a7a3d)' : 'var(--gj-red-ink)' }}>{msg.text}</p>
      )}

      {membres.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucun membre rattaché (partenaire référencé sans compte).</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {membres.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-4 flex-wrap py-[8px]" style={{ borderBottom: '1px solid var(--gj-line)' }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>{m.nom}</span>
                  <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
                    {ROLE_LABEL[m.role]}
                  </span>
                  <span
                    className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide"
                    style={m.statut === 'actif'
                      ? { background: 'var(--gj-green-soft, #e6f6ec)', color: 'var(--gj-green-ink, #1a7a3d)' }
                      : { background: 'var(--gj-line)', color: 'var(--gj-grey)' }}
                  >
                    {m.statut === 'actif' ? 'Actif' : 'Révoqué'}
                  </span>
                </div>
                <p className="text-[12.5px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
                  {m.contact || '—'} · {PERSONNE_LABEL[m.personneStatut] ?? m.personneStatut}
                </p>
              </div>
              {m.personneStatut !== 'anonymise' && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => basculer(m)}
                  className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[38px] disabled:opacity-60"
                  style={m.statut === 'actif'
                    ? { background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' }
                    : { background: 'var(--gj-green, #2b9e54)', color: '#fff', border: 'none' }}
                >
                  <Icon name={m.statut === 'actif' ? 'block' : 'check'} size={14} />
                  {m.statut === 'actif' ? 'Révoquer' : 'Réactiver'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <RattacherMembreModal
        isOpen={open}
        onClose={() => setOpen(false)}
        organisationId={organisationId}
        onDone={(text, ok) => {
          setMsg({ text, ok })
          if (ok) router.refresh()
        }}
      />
    </div>
  )
}
