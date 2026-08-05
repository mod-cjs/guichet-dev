'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { demanderCorrection } from './actions'

interface CorrectionModalProps {
  isOpen: boolean
  onClose: () => void
  offreId: string
  offreTitre: string
  onDone: (message: string, ok: boolean) => void
}

/**
 * GUIC-702 · PR-C — modale « Demander correction » (renvoi au recruteur).
 * L'offre reste brouillon ; le recruteur reçoit le message et corrige.
 */
export function CorrectionModal({ isOpen, onClose, offreId, offreTitre, onDone }: CorrectionModalProps) {
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  function handleEnvoyer() {
    const texte = message.trim()
    if (!texte) return
    startTransition(async () => {
      try {
        await demanderCorrection(offreId, texte)
        onDone(`Correction demandée au recruteur pour « ${offreTitre} ».`, true)
        onClose()
        setMessage('')
      } catch {
        onDone(`Échec : « ${offreTitre} » n'est peut-être plus en attente.`, false)
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Demander une correction"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-[9px] px-[16px] py-[10px] font-bold text-[13px] disabled:opacity-60"
            style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}
          >
            Annuler
          </button>
          <Button
            type="button"
            variant="primary"
            onClick={handleEnvoyer}
            disabled={pending || !message.trim()}
            className="!rounded-[9px] font-black text-[13px] disabled:opacity-60"
            style={{ background: 'var(--gj-teal-deep)' }}
          >
            Envoyer au recruteur
          </Button>
        </>
      }
    >
      <p className="text-[13px] mb-[14px]" style={{ color: 'var(--gj-grey)' }}>
        L'offre reste en attente. Le recruteur reçoit votre message, corrige et resoumet — aucune republication
        automatique.
      </p>
      <label className="block text-[12px] font-bold mb-[6px]" style={{ color: 'var(--gj-grey)' }}>
        Ce qui doit être corrigé
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        aria-label="Message de correction"
        placeholder="Ex. : merci de retirer les frais d'inscription et le numéro personnel de la description."
        className="w-full rounded-[9px] px-[12px] py-[10px] text-[13px] resize-y"
        style={{ background: 'var(--gj-surface)', color: 'var(--gj-ink)', border: '1.5px solid var(--gj-line)' }}
      />
    </Modal>
  )
}
