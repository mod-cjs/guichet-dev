'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { rejeterOpportunite } from './actions'

/** Motifs préréglés — le plus fréquent (offre payante) en tête. */
const MOTIFS = [
  'Offre payante / frais demandés',
  'Contenu inapproprié ou trompeur',
  'Doublon d’une offre existante',
  'Organisme non identifié / non vérifiable',
  'Autre (préciser)',
] as const

interface RejetMotifModalProps {
  isOpen: boolean
  onClose: () => void
  offreId: string
  offreTitre: string
  onDone: (message: string, ok: boolean) => void
}

/**
 * GUIC-702 — modale de rejet motivé (remplace `window.prompt`).
 * Motif préréglé + précision libre → persisté sur l'offre (`motifRejet`) et
 * notifié au recruteur (infra existante GUIC-547).
 */
export function RejetMotifModal({ isOpen, onClose, offreId, offreTitre, onDone }: RejetMotifModalProps) {
  const [motif, setMotif] = useState<string>(MOTIFS[0])
  const [detail, setDetail] = useState('')
  const [pending, startTransition] = useTransition()

  function handleRejeter() {
    const motifComplet = detail.trim() ? `${motif} — ${detail.trim()}` : motif
    startTransition(async () => {
      try {
        await rejeterOpportunite(offreId, motifComplet)
        onDone(`« ${offreTitre} » rejetée.`, true)
        onClose()
        setDetail('')
      } catch {
        onDone(`Échec : « ${offreTitre} » a peut-être déjà été modérée.`, false)
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rejeter la publication"
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
            onClick={handleRejeter}
            disabled={pending}
            className="!rounded-[9px] font-black text-[13px] disabled:opacity-60"
            style={{ background: 'var(--gj-red)' }}
          >
            Rejeter définitivement
          </Button>
        </>
      }
    >
      <p className="text-[13px] mb-[14px]" style={{ color: 'var(--gj-grey)' }}>
        Le motif est <b style={{ color: 'var(--gj-ink)' }}>journalisé</b> et transmis au recruteur, qui pourra
        corriger et resoumettre.
      </p>

      <label className="block text-[12px] font-bold mb-[6px]" style={{ color: 'var(--gj-grey)' }}>
        Motif
      </label>
      <select
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        aria-label="Motif du rejet"
        className="w-full rounded-[9px] px-[12px] py-[10px] text-[13px] mb-[14px]"
        style={{ background: 'var(--gj-surface)', color: 'var(--gj-ink)', border: '1.5px solid var(--gj-line)' }}
      >
        {MOTIFS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <label className="block text-[12px] font-bold mb-[6px]" style={{ color: 'var(--gj-grey)' }}>
        Précision (optionnelle)
      </label>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={3}
        aria-label="Précision du motif"
        placeholder="Ex. : frais d’inscription de 10 000 FCFA demandés dans la description."
        className="w-full rounded-[9px] px-[12px] py-[10px] text-[13px] resize-y"
        style={{ background: 'var(--gj-surface)', color: 'var(--gj-ink)', border: '1.5px solid var(--gj-line)' }}
      />
    </Modal>
  )
}
