'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Sheet, Button, FileUpload, Icon } from '@/components/ui'

export interface ViewerInfo {
  prenom: string
  nom: string
  email?: string | null
  telephone: string | null
}

interface CandidatureModalProps {
  opportuniteId: string
  opportuniteTitre: string
  /** Indique si le sous-type d'opportunité réclame un fichier (CV) — sinon il reste facultatif. */
  requiresFileUpload?: boolean
  /** Libellé du fichier attendu (ex. « Dossier de bourse »). Défaut : « CV ». */
  fileLabel?: string | null
  viewer: ViewerInfo
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const LETTRE_MAX = 2000
const LETTRE_MIN = 300

type Step = 1 | 2 | 3 | 4

/**
 * GUIC-189 — Flow candidature multi-étapes (Vérif profil → Lettre + CV → Récap →
 * Confirmation). Mobile : bottom-sheet plein écran. Desktop : slide-over droit
 * via le composant `<Sheet variant="side">`.
 *
 * L'upload de CV utilise `@vercel/blob/client#upload` ; l'URL retournée est
 * persistée via `POST /api/candidatures` avec le reste du formulaire.
 */
export function CandidatureModal({
  opportuniteId,
  opportuniteTitre,
  requiresFileUpload = false,
  fileLabel,
  viewer,
  isOpen,
  onClose,
  onSuccess,
}: CandidatureModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [lettre, setLettre] = useState('')
  const [consent, setConsent] = useState(false)
  const [cgu, setCgu] = useState(false)
  const [cv, setCv] = useState<{ url: string; name: string; sizeKb: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const profilComplet = useMemo(
    () => Boolean(viewer.prenom && viewer.nom && viewer.telephone),
    [viewer],
  )

  const lettreLen = lettre.trim().length
  const lettreValid = lettreLen >= LETTRE_MIN
  const cvValid = !requiresFileUpload || cv !== null
  const canSubmit = lettreValid && cvValid && cgu && !sending

  const reset = useCallback(() => {
    setStep(1)
    setLettre('')
    setConsent(false)
    setCgu(false)
    setCv(null)
    setError(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  // Notifie le parent dès l'arrivée à l'écran succès (mise à jour optimiste
  // de l'état « déjà candidaté » côté détail).
  useEffect(() => {
    if (step === 4) onSuccess()
  }, [step, onSuccess])

  async function submit() {
    if (!canSubmit) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportuniteId,
          lettreMotivation: lettre.trim(),
          notificationsConsent: consent,
          cvUrl: cv?.url,
        }),
      })
      if (res.status === 201) {
        setStep(4)
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

  // Stepper visuel (3 étapes — la 4 = écran succès).
  const Stepper = () => (
    <div className="flex items-center gap-space-1 mb-space-3" aria-hidden={step === 4}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1 flex-1 rounded-full transition-colors ${
            n <= step ? 'bg-gj-teal-deep' : 'bg-gj-line'
          }`}
        />
      ))}
    </div>
  )

  return (
    <Sheet
      isOpen={isOpen}
      onClose={close}
      title={step === 4 ? 'Candidature envoyée' : `Postuler — ${opportuniteTitre}`}
      variant="side"
    >
      {step !== 4 && <Stepper />}

      {error && (
        <div
          role="alert"
          className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-3 text-fs-200 mb-space-3"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <Step1Profil
          viewer={viewer}
          profilComplet={profilComplet}
          onContinue={() => setStep(2)}
          onCancel={close}
        />
      )}

      {step === 2 && (
        <Step2LettreCV
          lettre={lettre}
          onLettreChange={setLettre}
          lettreValid={lettreValid}
          lettreLen={lettreLen}
          cv={cv}
          onCvChange={setCv}
          onCvError={setError}
          requiresFileUpload={requiresFileUpload}
          fileLabel={fileLabel}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
          canContinue={lettreValid && cvValid}
        />
      )}

      {step === 3 && (
        <Step3Recap
          viewer={viewer}
          lettre={lettre}
          cv={cv}
          consent={consent}
          onConsentChange={setConsent}
          cgu={cgu}
          onCguChange={setCgu}
          onBack={() => setStep(2)}
          onSubmit={submit}
          canSubmit={canSubmit}
          sending={sending}
        />
      )}

      {step === 4 && <Step4Success onClose={close} />}
    </Sheet>
  )
}

// ─────────────────────────────────────────────
// Étapes
// ─────────────────────────────────────────────

function Step1Profil({
  viewer,
  profilComplet,
  onContinue,
  onCancel,
}: {
  viewer: ViewerInfo
  profilComplet: boolean
  onContinue: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-space-3">
      <p className="text-fs-300 text-color-text-secondary">
        Vérifiez que ces informations seront transmises au recruteur.
      </p>
      <dl className="bg-gj-bg rounded-gj-md p-space-3 grid gap-space-2 text-fs-200">
        <Row label="Prénom" value={viewer.prenom} />
        <Row label="Nom" value={viewer.nom} />
        {viewer.email && <Row label="Email" value={viewer.email} />}
        <Row label="Téléphone" value={viewer.telephone ?? '—'} missing={!viewer.telephone} />
      </dl>
      {!profilComplet && (
        <Link
          href="/jeune/profil"
          className="text-fs-300 font-bold text-gj-teal-deep underline"
        >
          Compléter mon profil →
        </Link>
      )}
      <div className="flex gap-space-2 mt-space-2">
        <Button variant="ghost" size="lg" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onContinue}
          disabled={!profilComplet}
        >
          Continuer
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex justify-between gap-space-2">
      <dt className="text-color-text-muted">{label}</dt>
      <dd
        className={`font-bold ${
          missing ? 'text-gj-red-ink' : 'text-color-text-primary'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function Step2LettreCV({
  lettre,
  onLettreChange,
  lettreValid,
  lettreLen,
  cv,
  onCvChange,
  onCvError,
  requiresFileUpload,
  fileLabel,
  onBack,
  onContinue,
  canContinue,
}: {
  lettre: string
  onLettreChange: (v: string) => void
  lettreValid: boolean
  lettreLen: number
  cv: { url: string; name: string; sizeKb: number } | null
  onCvChange: (v: { url: string; name: string; sizeKb: number } | null) => void
  onCvError: (msg: string) => void
  requiresFileUpload: boolean
  fileLabel?: string | null
  onBack: () => void
  onContinue: () => void
  canContinue: boolean
}) {
  return (
    <div className="flex flex-col gap-space-4">
      <div>
        <label
          htmlFor="lettre"
          className="text-fs-100 font-bold uppercase tracking-wide text-color-text-muted"
        >
          Lettre de motivation <span className="text-gj-red">*</span>
        </label>
        <textarea
          id="lettre"
          value={lettre}
          onChange={(e) => onLettreChange(e.target.value.slice(0, LETTRE_MAX))}
          rows={8}
          aria-invalid={!lettreValid && lettreLen > 0}
          className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
            text-[16px] font-[inherit] focus:outline-none focus:border-gj-teal-deep
            focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
        />
        <div className="flex justify-between gap-space-2 mt-space-1 text-fs-100">
          <span className={lettreValid ? 'text-color-text-muted' : 'text-gj-red-ink'}>
            {lettreValid ? 'Bien, c’est suffisant.' : `Minimum ${LETTRE_MIN} caractères.`}
          </span>
          <span className="text-color-text-muted shrink-0">
            {lettreLen} / {LETTRE_MAX}
          </span>
        </div>
      </div>

      <FileUpload
        handleUploadUrl="/api/upload/cv"
        accept="application/pdf"
        maxSizeMb={5}
        label={`${fileLabel ?? 'CV'}${requiresFileUpload ? ' *' : ' (facultatif)'}`}
        hint="PDF · max 5 Mo · stocké dans un coffre-fort sécurisé"
        value={cv?.url}
        onChange={onCvChange}
        onError={onCvError}
      />

      <div className="flex gap-space-2 mt-space-2">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Retour
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Continuer
        </Button>
      </div>
    </div>
  )
}

function Step3Recap({
  viewer,
  lettre,
  cv,
  consent,
  onConsentChange,
  cgu,
  onCguChange,
  onBack,
  onSubmit,
  canSubmit,
  sending,
}: {
  viewer: ViewerInfo
  lettre: string
  cv: { url: string; name: string; sizeKb: number } | null
  consent: boolean
  onConsentChange: (v: boolean) => void
  cgu: boolean
  onCguChange: (v: boolean) => void
  onBack: () => void
  onSubmit: () => void
  canSubmit: boolean
  sending: boolean
}) {
  return (
    <div className="flex flex-col gap-space-3">
      <div className="bg-gj-bg rounded-gj-md p-space-3 text-fs-200">
        <p className="font-bold text-color-text-primary">
          {viewer.prenom} {viewer.nom}
        </p>
        {viewer.telephone && (
          <p className="text-color-text-secondary">{viewer.telephone}</p>
        )}
      </div>

      <div>
        <p className="text-fs-100 font-bold uppercase tracking-wide text-color-text-muted">
          Lettre de motivation
        </p>
        <p className="text-fs-200 text-color-text-primary whitespace-pre-line mt-space-1">
          {lettre}
        </p>
      </div>

      {cv && (
        <div className="bg-gj-bg rounded-gj-md p-space-3 flex items-center gap-space-2 text-fs-200">
          <span
            className="inline-flex h-10 w-8 items-center justify-center rounded-[4px]
              bg-gj-red-soft text-gj-red-ink text-[10px] font-black"
            aria-hidden
          >
            PDF
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-color-text-primary">{cv.name}</p>
            <p className="text-fs-100 text-color-text-muted">{cv.sizeKb} Ko</p>
          </div>
        </div>
      )}

      <label className="flex items-start gap-space-2 text-fs-200 text-color-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-[2px] w-5 h-5 accent-gj-teal shrink-0"
        />
        <span>
          J’accepte de recevoir la confirmation et le suivi de ma candidature par WhatsApp/SMS.
        </span>
      </label>

      <label className="flex items-start gap-space-2 text-fs-200 text-color-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={cgu}
          onChange={(e) => onCguChange(e.target.checked)}
          className="mt-[2px] w-5 h-5 accent-gj-teal shrink-0"
          aria-required
        />
        <span>
          J’accepte que le recruteur reçoive mon profil CJS et me contacte (CGU).
        </span>
      </label>

      <div className="flex gap-space-2 mt-space-2">
        <Button variant="ghost" size="lg" onClick={onBack} disabled={sending}>
          Retour
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          loading={sending}
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          Envoyer ma candidature
        </Button>
      </div>
    </div>
  )
}

function Step4Success({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-space-3 py-space-4">
      <div
        className="w-16 h-16 rounded-full bg-gj-green-soft text-gj-green-ink
          flex items-center justify-center"
        aria-hidden
      >
        <Icon name="check-circle" className="w-8 h-8" />
      </div>
      <h3 className="text-fs-500 font-black text-color-text-primary">
        Candidature envoyée
      </h3>
      <p className="text-fs-300 text-color-text-secondary max-w-[40ch]">
        Le recruteur a reçu votre dossier. Vous serez notifié·e de la suite par
        WhatsApp ou SMS.
      </p>
      <div className="flex flex-col gap-space-2 w-full max-w-[280px]">
        <Link
          href="/jeune/mes-candidatures"
          className="inline-flex items-center justify-center bg-gj-teal-deep text-white
            font-bold rounded-gj-md min-h-[var(--tap-comfortable)] px-space-4"
        >
          Suivre ma candidature
        </Link>
        <Button variant="ghost" size="lg" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  )
}

// Notification finale est confiée au parent via `onSuccess` (toast), si fourni.
// Le composant exporte un effet : quand on atteint step 4, on notifie.
// Implémentation : le parent observe `onSuccess` indirectement via le clic Fermer
// ou la redirection (la candidature est déjà enregistrée serveur-side).
//
// NB : pour notifier le parent dès l'arrivée à step 4 (mise à jour de
// `dejaCandidate`), on déclenche dans le composant principal :
export const __INTERNAL = { LETTRE_MIN, LETTRE_MAX } // pour les tests
