'use client'
/**
 * CandidatureModal — formulaire unique de candidature (GUIC-189 / Wave 6 / GUIC-220).
 *
 * Refonte v2 : on supprime le stepper en 4 étapes pour un single-sheet scroll
 * aligné sur `design-guichet-v2/lot3-opps-mobile.jsx#MobileApplySheet` (L.408-538).
 *
 * Le formulaire affiche :
 *  - un bandeau « Pré-rempli depuis ton profil »
 *  - une carte profil (avatar gradient + identité)
 *  - une textarea lettre de motivation (compteur live, bouton « Yaye m'aide »)
 *  - un FileUpload CV (composant v2 — GUIC-217)
 *  - une checkbox CGU unique
 *  - un CTA sticky bas + footer WhatsApp
 *
 * À la réussite (`201`), l'écran bascule sur un état succès « WhatsApp preview »
 * avec animation pulse, référence candidature et 2 CTAs. Le parent décide via
 * `onSuccess()` quoi faire ensuite, mais l'écran succès reste dans le sheet.
 */
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { Sheet, Button, Icon, FileUpload } from '@/components/ui'
import type { UploadedFileMeta, FileUploader } from '@/components/ui'
import {
  LETTRE_MAX_CHARS,
  MAX_CV_MB,
} from '@/lib/constants/candidature'

export interface ViewerInfo {
  prenom: string
  nom: string
  telephone: string | null
  /** Âge optionnel (rendu si fourni). */
  age?: number | null
  /** Région optionnelle (rendu si fourni). */
  region?: string | null
}

interface CandidatureModalProps {
  opportuniteId: string
  opportuniteTitre: string
  viewer: ViewerInfo
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Nom de l'organisation, intégré au texte de consentement. */
  organisationName?: string
  /** Si vrai, le CV est obligatoire (sinon facultatif — design v2). */
  requiresFileUpload?: boolean
  /**
   * Implémentation d'upload du CV — injectable pour tests. Par défaut, POST
   * vers `/api/upload/cv` (GUIC-218 / GUIC-217).
   */
  uploader?: FileUploader
}

/** Upload par défaut — POST atomique vers `/api/upload/cv`. */
const defaultUploader: FileUploader = async (safeName, file) => {
  const fd = new FormData()
  fd.append('file', file, safeName)
  const res = await fetch('/api/upload/cv', { method: 'POST', body: fd })
  if (!res.ok) {
    throw new Error(`Échec de l'upload (${res.status}).`)
  }
  const body = (await res.json()) as { data?: UploadedFileMeta }
  if (!body.data) throw new Error("Réponse d'upload invalide.")
  return body.data
}

/** Retourne les initiales (max 2) à partir de prénom + nom. */
function initiales(prenom: string, nom: string): string {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase()
}

/** Raccourcit un UUID en référence lisible `CAND-XXXXXXXX`. */
function refCandidature(id: string): string {
  const short = id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `CAND-${short}`
}

/** Libellés FR des champs profil manquants (GUIC-232). */
const PROFIL_FIELD_LABELS: Record<string, string> = {
  prenom: 'prénom',
  nom: 'nom',
  email: 'email',
  telephone: 'téléphone',
  region: 'région',
  niveauEtude: 'niveau d’études',
  situationEmploi: 'situation actuelle',
  domainesInteret: 'domaines d’intérêt',
}

export function CandidatureModal({
  opportuniteId,
  opportuniteTitre,
  viewer,
  isOpen,
  onClose,
  onSuccess,
  organisationName,
  requiresFileUpload = false,
  uploader = defaultUploader,
}: CandidatureModalProps) {
  const [lettre, setLettre] = useState('')
  const [consent, setConsent] = useState(false)
  const [cv, setCv] = useState<UploadedFileMeta | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null)
  // GUIC-232 — état complétude profil (null = en cours de chargement).
  const [profilMissing, setProfilMissing] = useState<string[] | null>(null)

  const lettreId = useId()
  const helperId = useId()
  const counterId = useId()
  const cguId = useId()

  // Reset complet à la (re)fermeture pour éviter de réafficher l'écran succès
  // à la prochaine ouverture.
  useEffect(() => {
    if (!isOpen) {
      setLettre('')
      setConsent(false)
      setCv(null)
      setError(null)
      setSubmitted(null)
      setSending(false)
      setProfilMissing(null)
    }
  }, [isOpen])

  // GUIC-232 — vérifie la complétude du profil à l'ouverture du modal.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/profil/completude', { credentials: 'same-origin' })
        if (!res.ok) {
          if (!cancelled) setProfilMissing([])
          return
        }
        const body = (await res.json()) as {
          data?: { complet?: boolean; missing?: string[] }
        }
        if (!cancelled) {
          setProfilMissing(body.data?.missing ?? [])
        }
      } catch {
        // En cas d'erreur réseau, on n'empêche pas l'utilisateur d'essayer ;
        // le backend re-validera et renverra 403 si besoin.
        if (!cancelled) setProfilMissing([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const lettreOk = lettre.trim().length > 0
  const cvOk = !requiresFileUpload || cv !== null
  const profilIncomplet = (profilMissing?.length ?? 0) > 0
  const canSubmit = lettreOk && cvOk && consent && !sending && !profilIncomplet

  const disabledReason = useMemo(() => {
    if (sending) return 'Envoi en cours…'
    if (profilIncomplet) return 'Complétez votre profil pour candidater.'
    if (!lettreOk) return 'Rédigez votre lettre de motivation.'
    if (!cvOk) return 'Ajoutez votre CV (PDF, max ' + MAX_CV_MB + ' Mo).'
    if (!consent) return 'Vous devez accepter la transmission du profil.'
    return undefined
  }, [sending, lettreOk, cvOk, consent, profilIncomplet])

  const handleClose = useCallback(() => {
    if (submitted) {
      onClose()
      return
    }
    const hasData = lettre.trim().length > 0 || cv !== null
    if (hasData) {
      // Garde-fou perte de données : confirm natif (composant Modal serait
      // plus joli mais induirait un état imbriqué — `window.confirm` reste
      // accessible, focus-safe, et a l'aval design pour ce cas extrême).
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              'Vous avez des données non envoyées. Quitter quand même ?',
            )
      if (!ok) return
    }
    onClose()
  }, [submitted, lettre, cv, onClose])

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
          lettreMotivation: lettre.trim() || undefined,
          notificationsConsent: consent,
          // Champs ajoutés par GUIC-218 — l'API actuelle ignore les
          // propriétés inconnues, donc rétrocompatible.
          cvUrl: cv?.url,
        }),
      })
      if (res.status === 201) {
        const body = (await res.json().catch(() => null)) as
          | { data?: { id?: string } }
          | null
        setSubmitted({ id: body?.data?.id ?? opportuniteId })
        onSuccess()
        return
      }
      if (res.status === 403) {
        // GUIC-232 — profil incomplet : recharge la liste des champs manquants.
        const body = (await res.json().catch(() => null)) as
          | { error?: { code?: string; missing?: string[] } }
          | null
        if (body?.error?.code === 'PROFILE_INCOMPLETE') {
          setProfilMissing(body.error.missing ?? [])
          setError('Complétez votre profil pour pouvoir candidater.')
        } else {
          setError('Accès refusé.')
        }
      }
      else if (res.status === 409) setError('Vous avez déjà postulé à cette opportunité.')
      else if (res.status === 422) setError("Cette opportunité n'accepte plus de candidatures.")
      else if (res.status === 401) setError('Votre session a expiré, reconnectez-vous.')
      else setError('Une erreur est survenue. Réessayez.')
    } catch {
      setError('Connexion impossible. Réessayez.')
    } finally {
      setSending(false)
    }
  }

  if (submitted) {
    return (
      <Sheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Candidature envoyée"
        variant="side"
      >
        <SuccessScreen
          refId={refCandidature(submitted.id)}
          opportuniteTitre={opportuniteTitre}
          telephone={viewer.telephone}
        />
      </Sheet>
    )
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={`Postuler — ${opportuniteTitre}`}
      variant="side"
    >
      {error && (
        <div
          role="alert"
          className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-3 text-fs-200 mb-space-3"
        >
          {error}
        </div>
      )}

      {/* GUIC-232 — Bandeau profil incomplet */}
      {profilIncomplet && (
        <div
          role="alert"
          data-testid="profil-incomplet-banner"
          className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-3 text-fs-200 mb-space-3"
        >
          <p className="font-bold">Complète ton profil pour pouvoir candidater.</p>
          <p className="mt-space-1">
            Champs manquants :{' '}
            {(profilMissing ?? [])
              .map((f) => PROFIL_FIELD_LABELS[f] ?? f)
              .join(', ')}
          </p>
          <Link
            href="/jeune/profil"
            className="inline-block mt-space-2 font-bold underline"
          >
            Compléter mon profil →
          </Link>
        </div>
      )}

      {/* Bandeau pré-rempli */}
      <div
        className="flex items-center gap-space-2 rounded-gj-md border border-gj-green
          bg-gj-green-soft text-gj-green-ink px-space-3 py-space-2 text-fs-200 font-bold mb-space-3"
      >
        <Icon name="check-circle" size={18} />
        <span>Pré-rempli depuis ton profil. Vérifie et ajuste.</span>
      </div>

      {/* Carte profil */}
      <div className="rounded-gj-md border border-gj-line bg-white p-space-3 mb-space-4">
        <div className="flex items-center gap-space-2">
          <span
            aria-hidden
            className="inline-flex items-center justify-center shrink-0 rounded-full text-white font-black"
            style={{
              width: 36,
              height: 36,
              fontSize: 13,
              background:
                'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
            }}
          >
            {initiales(viewer.prenom, viewer.nom)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-fs-300 font-bold text-color-text-primary truncate">
              {viewer.prenom} {viewer.nom}
              {viewer.age ? ` · ${viewer.age} ans` : ''}
            </p>
            <p className="text-fs-100 text-color-text-muted truncate">
              {viewer.telephone ?? '—'}
              {viewer.region ? ` · ${viewer.region}` : ''}
            </p>
          </div>
        </div>
        <Link
          href="/jeune/profil"
          className="inline-block mt-space-2 text-fs-200 font-bold text-gj-teal-deep hover:underline"
        >
          Modifier dans mon profil →
        </Link>
      </div>

      {/* Lettre de motivation */}
      <label
        htmlFor={lettreId}
        className="text-fs-300 font-bold text-color-text-primary"
      >
        Lettre de motivation <span className="text-gj-red">*</span>
      </label>
      <textarea
        id={lettreId}
        value={lettre}
        onChange={(e) => setLettre(e.target.value.slice(0, LETTRE_MAX_CHARS))}
        rows={6}
        aria-required="true"
        aria-invalid={!lettreOk && lettre.length > 0 ? 'true' : 'false'}
        aria-describedby={`${helperId} ${counterId}`}
        placeholder="Pourquoi cette opportunité te correspond ? Parle de ton parcours, tes envies, ce que tu apporterais."
        className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
          text-[16px] font-[inherit] focus:outline-none focus:border-gj-teal-deep
          focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
      />
      <div className="flex justify-between gap-space-2 mt-space-1 text-fs-100">
        <button
          type="button"
          onClick={() => {
            // Mock — l'intégration LLM réelle viendra via le module Yaye.
            setLettre((prev) =>
              prev.length > 0
                ? prev
                : "Cette opportunité m'intéresse car elle correspond à mon parcours et à mes envies. Je souhaite contribuer à...",
            )
          }}
          className="inline-flex items-center gap-space-1 text-gj-teal-deep font-bold hover:underline"
        >
          <Icon name="sparkle" size={14} /> Yaye m'aide
        </button>
        <span
          id={counterId}
          aria-live="polite"
          className="text-color-text-muted shrink-0"
        >
          {lettre.length} / {LETTRE_MAX_CHARS}
        </span>
      </div>
      <p id={helperId} className="text-fs-100 text-color-text-muted mt-space-1">
        Quelques lignes sur ta motivation augmentent tes chances.
      </p>

      {/* CV */}
      <div className="mt-space-4">
        <FileUpload
          label={`CV${requiresFileUpload ? '' : ' (facultatif)'}`}
          upload={uploader}
          onChange={setCv}
        />
      </div>

      {/* Consentement CGU unique */}
      <label
        htmlFor={cguId}
        className="flex items-start gap-space-2 mt-space-4 text-fs-300 text-color-text-primary cursor-pointer"
      >
        <input
          id={cguId}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-[2px] w-5 h-5 accent-gj-teal shrink-0"
        />
        <span>
          J&apos;accepte que {organisationName ?? "l'organisation"} reçoive mon
          profil CJS et me contacte.{' '}
          <Link href="/cgu" className="text-gj-teal-deep font-bold hover:underline">
            en savoir plus
          </Link>
        </span>
      </label>

      {/* CTA sticky */}
      <div
        className="sticky bottom-0 left-0 right-0 bg-white pt-space-3 pb-space-2 mt-space-5
          border-t border-gj-line -mx-space-4 px-space-4"
      >
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={sending}
          disabled={!canSubmit}
          onClick={submit}
          aria-describedby={disabledReason ? counterId : undefined}
          title={disabledReason}
        >
          Envoyer ma candidature
        </Button>
        <p className="flex items-center justify-center gap-space-1 mt-space-2 text-fs-100 text-color-text-muted">
          <Icon name="whatsapp" size={14} />
          Tu seras notifié par WhatsApp dès qu&apos;on a une réponse.
        </p>
      </div>
    </Sheet>
  )
}

/** Écran succès — preview WhatsApp + pulse animation. */
function SuccessScreen({
  refId,
  opportuniteTitre,
  telephone,
}: {
  refId: string
  opportuniteTitre: string
  telephone: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-space-4 text-center py-space-3">
      {/* Pulse success — réutilise keyframe `gj-pulse-live` (tokens.css). */}
      <div className="relative" style={{ width: 100, height: 100 }}>
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-gj-green-soft"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border-[3px] border-gj-green"
          style={{ animation: 'gj-pulse-live 2s infinite' }}
        />
        <span
          className="absolute rounded-full bg-gj-green text-white flex items-center justify-center"
          style={{
            inset: 18,
            boxShadow: '0 4px 20px rgba(0,170,90,.4)',
          }}
        >
          <Icon name="check" size={36} title="Candidature envoyée" />
        </span>
      </div>

      <div>
        <h2 className="text-fs-500 font-black text-color-text-primary">
          Candidature envoyée 🎉
        </h2>
        <p className="text-fs-300 text-color-text-muted mt-space-1">
          <b className="text-color-text-primary">{opportuniteTitre}</b> vient de
          recevoir ton dossier.
          <br />
          Référence{' '}
          <b className="text-gj-teal-deep" data-testid="candidature-ref">
            {refId}
          </b>
        </p>
      </div>

      {/* Preview WhatsApp */}
      <div className="w-full rounded-gj-md border border-gj-line bg-white overflow-hidden text-left">
        <div className="flex items-center gap-space-2 px-space-3 py-space-2 bg-gj-whatsapp text-white">
          <Icon name="whatsapp" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-fs-200 font-bold">WhatsApp · Guichet Jeunesse</p>
            <p className="text-fs-100 opacity-90 truncate">
              {telephone ?? '—'} · à l&apos;instant
            </p>
          </div>
        </div>
        <div
          className="px-space-3 py-space-3 flex flex-col gap-space-2"
          style={{ background: '#E5F0EC' }}
        >
          <div
            className="self-start bg-white px-space-3 py-space-2 max-w-[92%]
              text-fs-200 text-color-text-primary shadow-gj-sm"
            style={{ borderRadius: '14px 14px 14px 4px' }}
          >
            Ta candidature pour <b>{opportuniteTitre}</b> a bien été envoyée.
            <br />
            Réf. <b className="text-gj-teal-deep">{refId}</b>.<br />
            Tu reçois un message dès qu&apos;il y a une mise à jour.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-space-2 w-full">
        <Link
          href="/jeune/mes-candidatures"
          className="inline-flex items-center justify-center gap-space-2 min-h-[50px]
            rounded-gj-md bg-gj-teal-deep text-white font-bold text-fs-300 hover:opacity-90"
        >
          Suivre ma candidature <Icon name="arrow-right" size={18} />
        </Link>
        <Link
          href="/opportunites"
          className="inline-flex items-center justify-center min-h-[46px]
            rounded-gj-md border border-gj-line bg-white text-gj-teal-deep font-bold text-fs-200 hover:bg-gj-bg"
        >
          Voir d&apos;autres opportunités
        </Link>
      </div>
    </div>
  )
}
