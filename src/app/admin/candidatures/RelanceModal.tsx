'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { DestinataireRelance } from '@prisma/client'
import type { CanalRelance } from '@/lib/notifications/relance-plan'
import { relancerCandidatures } from './actions'

const LABEL = 'block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-color-text-muted mb-[7px]'
const FIELD = 'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[10px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)]'
const SEG = 'rounded-[9px] border px-2 py-[9px] text-[12.5px] font-bold transition-colors'
const OFF = 'border-[color:var(--gj-line-strong)] bg-transparent text-color-text-secondary hover:text-color-text-primary'
const ON = 'border-transparent bg-[var(--gj-admin-gold)] text-[color:var(--gj-admin-on-gold)]'

const CANAUX: { value: CanalRelance; label: string; template?: boolean }[] = [
  { value: 'in_app', label: 'Notification in-app' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp', template: true },
  { value: 'sms', label: 'SMS', template: true },
]
const DESTS: { value: DestinataireRelance; label: string }[] = [
  { value: 'Recruteur', label: 'Recruteur' }, { value: 'Candidat', label: 'Candidat' }, { value: 'Les_deux', label: 'Les deux' },
]

/** Modale de relance (admin — supervision). N candidature(s). GUIC-692 PR-C. */
export function RelanceModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone?: (r: { envoyees: number; ignorees: number }) => void }) {
  const [destinataire, setDestinataire] = useState<DestinataireRelance>('Recruteur')
  const [canaux, setCanaux] = useState<CanalRelance[]>(['in_app'])
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(c: CanalRelance) {
    setCanaux((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }
  function submit() {
    setError(null)
    if (canaux.length === 0) { setError('Sélectionnez au moins un canal.'); return }
    startTransition(async () => {
      try {
        const r = await relancerCandidatures(ids, { destinataire, canaux, message })
        onDone?.(r); onClose()
      } catch { setError('Relance impossible.') }
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={ids.length > 1 ? `Relancer ${ids.length} candidatures` : 'Relancer'}
      maxWidth="max-w-[480px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)]">Annuler</Button>
          <Button type="button" variant="primary" onClick={submit} disabled={pending} className="!bg-[var(--gj-admin-gold)] !text-[color:var(--gj-admin-on-gold)]">Envoyer la relance</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[16px]">
        <div>
          <label htmlFor="rel-dest" className={LABEL}>Destinataire</label>
          <select id="rel-dest" className={FIELD} value={destinataire} onChange={(e) => setDestinataire(e.target.value as DestinataireRelance)}>
            {DESTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div>
          <span className={LABEL}>Canaux</span>
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Canaux">
            {CANAUX.map((c) => {
              const on = canaux.includes(c.value)
              return (
                <button key={c.value} type="button" aria-pressed={on} onClick={() => toggle(c.value)} className={`${SEG} ${on ? ON : OFF}`}>{c.label}</button>
              )
            })}
          </div>
          <p className="text-[11px] text-color-text-muted mt-[7px]">In-app et e-mail : message libre. WhatsApp/SMS partent par <b>template</b> (et sont ignorés si le destinataire n&apos;a pas de numéro).</p>
        </div>

        <div>
          <label htmlFor="rel-msg" className={LABEL}>Message</label>
          <textarea id="rel-msg" className={`${FIELD} min-h-[80px]`} placeholder="Ex. Merci de traiter cette candidature en attente…" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </div>
    </Modal>
  )
}
