'use client'
import { useEffect, useState } from 'react'
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

interface ProfilCv {
  cvUrl: string | null
  name: string
  uploadedAt: string | null
}

/** Déduit un nom de fichier lisible à partir d'une URL de CV. */
function deriveCvName(url: string, explicit: string): string {
  if (explicit) return explicit
  try {
    const u = new URL(url, 'https://placeholder.invalid')
    const last = u.pathname.split('/').filter(Boolean).pop()
    if (last) return decodeURIComponent(last)
  } catch {
    /* ignore */
  }
  return 'Mon CV'
}

function formatUploadedAt(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Formulaire de candidature (GUIC-21) — lettre + consentement + CV (GUIC-223). */
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

  // ── CV depuis profil (GUIC-223) ─────────────────────────────────────────────
  const [profilCv, setProfilCv] = useState<ProfilCv | null>(null)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [forceUpload, setForceUpload] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('/api/profil/cv')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return
        const data = (json?.data ?? null) as ProfilCv | null
        setProfilCv(data)
      })
      .catch(() => {
        if (!cancelled) setProfilCv(null)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const profilCvAvailable = !!profilCv?.cvUrl && !forceUpload
  const cvName = profilCv?.cvUrl ? deriveCvName(profilCv.cvUrl, profilCv.name) : ''
  const cvDate = formatUploadedAt(profilCv?.uploadedAt ?? null)

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
          cvUrl: cvUrl || undefined,
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

      {/* ── CV (GUIC-223) ─────────────────────────────────────────────────── */}
      <section aria-live="polite" data-testid="cv-section" className="mb-space-4">
        <p className="text-fs-300 font-bold text-color-text-primary mb-space-2">
          CV <span className="text-color-text-muted font-normal">(facultatif)</span>
        </p>

        {profilCvAvailable ? (
          <div
            data-testid="cv-profil-card"
            className="bg-gj-bg rounded-gj-md p-space-3 border border-gj-line flex items-start gap-space-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold text-color-text-primary truncate">
                {cvName || 'Mon CV'}
              </p>
              {cvDate && (
                <p className="text-fs-100 text-color-text-muted mt-space-1">
                  Mis à jour le {cvDate}
                </p>
              )}
              {cvUrl === profilCv?.cvUrl && (
                <p className="text-fs-100 text-gj-teal-deep mt-space-1">
                  CV de profil sélectionné.
                </p>
              )}
            </div>
            <Button
              variant={cvUrl === profilCv?.cvUrl ? 'ghost' : 'secondary'}
              size="md"
              onClick={() => setCvUrl(profilCv?.cvUrl ?? null)}
              data-testid="cv-use-profil"
            >
              {cvUrl === profilCv?.cvUrl ? 'Sélectionné' : 'Utiliser ce CV'}
            </Button>
          </div>
        ) : (
          <div
            data-testid="cv-upload-zone"
            className="rounded-gj-md border-[1.5px] border-dashed border-gj-line p-space-4 text-center text-color-text-muted text-fs-200"
          >
            Glissez votre CV ici (PDF, max 5 Mo) — la prise en charge upload arrive bientôt.
          </div>
        )}

        {profilCv?.cvUrl && (
          <button
            type="button"
            onClick={() => {
              setForceUpload((v) => !v)
              if (!forceUpload) setCvUrl(null)
            }}
            className="mt-space-2 text-fs-100 text-gj-teal-deep underline"
            data-testid="cv-toggle-upload"
          >
            {forceUpload ? 'Réutiliser mon CV de profil' : 'Charger un nouveau CV'}
          </button>
        )}
      </section>

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
