'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { messageGroupe, type CanalMessage } from './actions'

const LABEL = 'block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-color-text-muted mb-[7px]'
const FIELD = 'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[10px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)]'
const SEG = 'rounded-[9px] border px-3 py-[9px] text-[12.5px] font-bold transition-colors'
const ON = 'border-transparent bg-[var(--gj-admin-gold)] text-[color:var(--gj-admin-on-gold)]'
const OFF = 'border-[color:var(--gj-line-strong)] bg-transparent text-color-text-secondary hover:text-color-text-primary'

const CANAUX: { value: CanalMessage; label: string }[] = [{ value: 'in_app', label: 'Notification in-app' }, { value: 'email', label: 'E-mail' }]

/** Message groupé aux utilisateurs sélectionnés (in-app + e-mail). GUIC-701 PR-C. */
export function MessageGroupeModal({ cjsUids, onClose, onDone }: { cjsUids: string[]; onClose: () => void; onDone?: (r: { envoyes: number; ignores: number }) => void }) {
  const [canaux, setCanaux] = useState<CanalMessage[]>(['in_app'])
  const [objet, setObjet] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(c: CanalMessage) { setCanaux((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])) }
  function submit() {
    setError(null)
    if (canaux.length === 0) { setError('Sélectionnez au moins un canal.'); return }
    if (!message.trim()) { setError('Le message est requis.'); return }
    startTransition(async () => {
      try { const r = await messageGroupe(cjsUids, { canaux, objet, message }); onDone?.(r); onClose() }
      catch { setError('Envoi impossible.') }
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Message groupé · ${cjsUids.length} destinataire${cjsUids.length > 1 ? 's' : ''}`}
      maxWidth="max-w-[480px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)]">Annuler</Button>
          <Button type="button" variant="primary" onClick={submit} disabled={pending} className="!bg-[var(--gj-admin-gold)] !text-[color:var(--gj-admin-on-gold)]">Envoyer le message</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[16px]">
        <div>
          <span className={LABEL}>Canaux</span>
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Canaux">
            {CANAUX.map((c) => {
              const on = canaux.includes(c.value)
              return <button key={c.value} type="button" aria-pressed={on} onClick={() => toggle(c.value)} className={`${SEG} ${on ? ON : OFF}`}>{c.label}</button>
            })}
          </div>
          <p className="text-[11px] text-color-text-muted mt-[7px]">L&apos;e-mail est ignoré pour les destinataires sans adresse. Les comptes anonymisés sont exclus.</p>
        </div>
        <div>
          <label htmlFor="mg-objet" className={LABEL}>Objet</label>
          <input id="mg-objet" className={FIELD} value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Objet du message…" />
        </div>
        <div>
          <label htmlFor="mg-msg" className={LABEL}>Message</label>
          <textarea id="mg-msg" className={`${FIELD} min-h-[90px]`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Votre message…" />
        </div>
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </div>
    </Modal>
  )
}
