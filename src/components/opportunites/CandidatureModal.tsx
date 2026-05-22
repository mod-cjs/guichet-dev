'use client'
import { useState } from 'react'
import { Sheet, Button } from '@/components/ui'

export interface ViewerInfo {
  prenom: string
  nom: string
  telephone: string | null
}

interface CandidatureModalProps {
  opportuniteId: string
  opportuniteTitre: string
  viewer: ViewerInfo
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MAX = 2000

/** Formulaire de candidature (GUIC-21) — lettre de motivation + consentement. */
export function CandidatureModal({
  opportuniteId,
  opportuniteTitre,
  viewer,
  isOpen,
  onClose,
  onSuccess,
}: CandidatureModalProps) {
  const [lettre, setLettre] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportuniteId,
          lettreMotivation: lettre.trim() || undefined,
          notificationsConsent: consent,
        }),
      })
      if (res.status === 201) {
        onSuccess()
        return
      }
      if (res.status === 409) setError('Vous avez déjà postulé à cette opportunité.')
      else if (res.status === 422) setError('Cette opportunité n’accepte plus de candidatures.')
      else if (res.status === 401) setError('Votre session a expiré, reconnectez-vous.')
      else setError('Une erreur est survenue. Réessayez.')
    } catch {
      setError('Connexion impossible. Réessayez.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Postuler — ${opportuniteTitre}`}
      variant="side"
    >
      {error && (
        <div className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-3 text-fs-200 mb-space-3">
          {error}
        </div>
      )}

      <div className="bg-gj-bg rounded-gj-md p-space-3 mb-space-4 text-fs-200">
        <p className="font-bold text-color-text-primary">
          {viewer.prenom} {viewer.nom}
        </p>
        {viewer.telephone && <p className="text-color-text-secondary">{viewer.telephone}</p>}
        <p className="text-color-text-muted mt-space-1">
          Ces informations seront transmises au recruteur avec votre candidature.
        </p>
      </div>

      <label htmlFor="lettre" className="text-fs-300 font-bold text-color-text-primary">
        Lettre de motivation <span className="text-color-text-muted font-normal">(facultatif)</span>
      </label>
      <textarea
        id="lettre"
        value={lettre}
        onChange={(e) => setLettre(e.target.value.slice(0, MAX))}
        rows={6}
        className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
          text-[16px] font-[inherit] focus:outline-none focus:border-gj-teal-deep
          focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
      />
      <div className="flex justify-between gap-space-2 mt-space-1 text-fs-100">
        <span className="text-color-text-muted">
          Quelques lignes sur votre motivation augmentent vos chances.
        </span>
        <span className="text-color-text-muted shrink-0">
          {lettre.length} / {MAX}
        </span>
      </div>

      <label className="flex items-start gap-space-2 mt-space-4 text-fs-300 text-color-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-[2px] w-5 h-5 accent-gj-teal shrink-0"
        />
        <span>
          J’accepte de recevoir la confirmation et le suivi de ma candidature par WhatsApp/SMS.
        </span>
      </label>

      <div className="flex gap-space-2 mt-space-5">
        <Button variant="ghost" size="lg" onClick={onClose} disabled={sending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          loading={sending}
          onClick={submit}
        >
          Envoyer ma candidature
        </Button>
      </div>
    </Sheet>
  )
}
