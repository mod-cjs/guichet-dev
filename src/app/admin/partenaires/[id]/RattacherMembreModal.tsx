'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { rechercherUtilisateurs, rattacherMembre, type UtilisateurTrouve } from '@/app/admin/partenaires/actions'

/**
 * GUIC-706 — rattacher une PERSONNE existante comme membre d'un partenaire (0..N).
 * Recherche par nom/email/téléphone (proxy local de `/users/find`) → rôle → rattache.
 * Le RÔLE recruteur reste attribué côté SSO ; ici on gère le rattachement local.
 */
export function RattacherMembreModal({
  isOpen,
  onClose,
  organisationId,
  onDone,
}: {
  isOpen: boolean
  onClose: () => void
  organisationId: string
  onDone: (message: string, ok: boolean) => void
}) {
  const [q, setQ] = useState('')
  const [resultats, setResultats] = useState<UtilisateurTrouve[] | null>(null)
  const [role, setRole] = useState<'recruteur' | 'titulaire'>('recruteur')
  const [pending, startTransition] = useTransition()

  function chercher(value: string) {
    setQ(value)
    if (value.trim().length < 2) {
      setResultats(null)
      return
    }
    startTransition(async () => {
      try {
        setResultats(await rechercherUtilisateurs(value))
      } catch {
        setResultats([])
      }
    })
  }

  function rattacher(u: UtilisateurTrouve) {
    startTransition(async () => {
      try {
        await rattacherMembre({ organisationId, cjsUid: u.cjsUid, role })
        onDone(`« ${`${u.prenom} ${u.nom}`.trim()} » rattaché·e (${role}).`, true)
        onClose()
      } catch (e) {
        const code = e instanceof Error ? e.message : ''
        onDone(code === 'DEJA_MEMBRE' ? 'Cette personne est déjà membre.' : 'Rattachement impossible.', false)
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rattacher un membre">
      <div className="flex flex-col gap-space-3">
        <div className="flex items-center gap-space-2 flex-wrap">
          <label className="text-[11px] font-black uppercase tracking-wide" style={{ color: 'var(--gj-grey)' }}>Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'recruteur' | 'titulaire')}
            className="rounded-[9px] px-[10px] py-[7px] text-[13px] font-bold"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
          >
            <option value="recruteur">Recruteur</option>
            <option value="titulaire">Titulaire</option>
          </select>
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => chercher(e.target.value)}
          placeholder="Rechercher par nom, email ou téléphone…"
          className="w-full rounded-[10px] px-[12px] py-[10px] text-[13.5px]"
          style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
        />

        {resultats === null ? (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Saisis au moins 2 caractères.</p>
        ) : resultats.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucun utilisateur trouvé.</p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {resultats.map((u) => (
              <button
                key={u.cjsUid}
                type="button"
                disabled={pending}
                onClick={() => rattacher(u)}
                className="flex items-center gap-[10px] text-left rounded-[10px] px-[12px] py-[9px]"
                style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
              >
                <span className="min-w-0">
                  <b className="text-[13.5px]">{`${u.prenom} ${u.nom}`.trim()}</b>
                  <span className="block text-[11.5px]" style={{ color: 'var(--gj-grey)' }}>{[u.email, u.telephone].filter(Boolean).join(' · ') || '—'}</span>
                </span>
                <span className="ml-auto text-[11.5px] font-bold" style={{ color: 'var(--gj-teal-deep)' }}>Rattacher</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-space-2" style={{ borderTop: '1px solid var(--gj-line)', paddingTop: 12 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            <Icon name="close" size={14} /> Fermer
          </Button>
        </div>
      </div>
    </Modal>
  )
}
