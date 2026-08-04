'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { anonymiserUtilisateur } from './actions'

const FIELD = 'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[10px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-red)]'

/**
 * Anonymisation (droit à l'effacement, CDP) — IRRÉVERSIBLE. Double confirmation :
 * saisir « ANONYMISER » + cocher. GUIC-701 PR-C.
 */
export function AnonymiserConfirmModal({ cjsUid, nom, onClose, onDone }: { cjsUid: string; nom: string; onClose: () => void; onDone?: () => void }) {
  const [saisie, setSaisie] = useState('')
  const [compris, setCompris] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const pret = saisie.trim() === 'ANONYMISER' && compris

  function submit() {
    if (!pret) return
    setError(null)
    startTransition(async () => {
      const r = await anonymiserUtilisateur(cjsUid)
      if (r.ok) { onDone?.(); onClose() }
      else setError(r.error === 'DEJA_ANONYMISE' ? 'Compte déjà anonymisé.' : r.error === 'FORBIDDEN' ? 'Action réservée aux administrateurs.' : 'Anonymisation impossible.')
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Anonymiser le compte"
      maxWidth="max-w-[480px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)]">Annuler</Button>
          <Button type="button" variant="primary" onClick={submit} disabled={!pret || pending} className="!bg-[var(--gj-red)] !text-white disabled:!opacity-50">Anonymiser définitivement</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[14px]">
        <p className="text-[13px] text-color-text-secondary">
          Vous allez <b>anonymiser</b> le compte de <b>{nom}</b> (droit à l&apos;effacement / CDP). Les données personnelles (nom, prénom, e-mail, téléphone, profil) seront <b>effacées définitivement</b>. Cette action est <b className="text-gj-red">irréversible</b>. Le <code>cjs_uid</code> et les agrégats non-nominatifs sont conservés.
        </p>
        <div>
          <label htmlFor="anon-confirm" className="block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-color-text-muted mb-[7px]">Tapez ANONYMISER pour confirmer</label>
          <input id="anon-confirm" className={FIELD} value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="ANONYMISER" autoComplete="off" />
        </div>
        <label className="flex items-center gap-[9px] text-[12.5px] text-color-text-secondary cursor-pointer">
          <input type="checkbox" checked={compris} onChange={(e) => setCompris(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--gj-red)' }} />
          J&apos;ai compris que cette action est irréversible.
        </label>
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </div>
    </Modal>
  )
}
