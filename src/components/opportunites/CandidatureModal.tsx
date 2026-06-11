'use client'
/**
 * CandidatureModal — formulaire unique de candidature (GUIC-189 / Wave 6 / GUIC-220).
 *
 * Refonte v2 : on supprime le stepper en 4 étapes pour un single-sheet scroll
 * aligné sur `design-guichet-v2/lot3-opps-mobile.jsx#MobileApplySheet` (L.408-538).
 *
 * Présentation responsive (GUIC-197) : bottom-sheet mobile (< md), modal centrée
 * desktop (≥ md) — cf. design v2 WebApplyModal.
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
import { useRouter } from 'next/navigation'
import { Sheet, Modal, Button, Icon, FileUpload } from '@/components/ui'
import type { UploadedFileMeta, FileUploader, DeferredFile } from '@/components/ui'
import {
  LETTRE_MAX_CHARS,
  MAX_CV_MB,
} from '@/lib/constants/candidature'

/**
 * Métadonnées du CV stocké sur le profil jeune (GUIC-223 / GUIC-224).
 * Renvoyé par `GET /api/profil/cv`.
 */
interface ProfilCvData {
  cvUrl: string | null
  name: string
  uploadedAt: string | null
}

const dateFmtCv = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Déduit un nom de fichier lisible à partir d'une URL. */
function deduceCvName(url: string, fallback?: string): string {
  if (fallback && fallback.trim().length > 0) return fallback
  try {
    const u = new URL(url, 'https://placeholder.local')
    const last = u.pathname.split('/').filter(Boolean).pop()
    if (last) return decodeURIComponent(last)
  } catch {
    /* noop */
  }
  return 'mon-cv.pdf'
}

export interface ViewerInfo {
  prenom: string
  nom: string
  telephone: string | null
  /** Âge optionnel (rendu si fourni). */
  age?: number | null
  /** Région optionnelle (rendu si fourni). */
  region?: string | null
  // GUIC-361 — Champs additionnels pour auto-fill complet du formulaire.
  /** Email — pré-rempli, éditable (read-only par défaut). */
  email?: string | null
  /** Niveau d'études (claim ProfilJeune.niveauEtude). */
  niveauEtude?: string | null
  /** Situation emploi actuelle (claim ProfilJeune.situationEmploi). */
  situationEmploi?: string | null
  /** Biographie — sert de placeholder enrichi pour la lettre de motivation. */
  biographie?: string | null
  /** Compétences listées dans le profil — affichées en tags. */
  competences?: string[]
  /** Domaines d'intérêt — affichés en tags. */
  domainesInteret?: string[]
  /** URL photo de profil (avatar). */
  photoUrl?: string | null
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
  /**
   * Slug de l'opportunité — utilisé pour deep-linker Yaye
   * (`/jeune/yaye?from=postuler&opp=<slug>`).
   */
  opportuniteSlug?: string
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
  opportuniteSlug,
  requiresFileUpload = false,
  uploader = defaultUploader,
}: CandidatureModalProps) {
  const router = useRouter()
  const [lettre, setLettre] = useState('')
  const [consent, setConsent] = useState(false)
  // GUIC-361 — Champs additionnels pré-remplis depuis le profil (éditables).
  const [email, setEmail] = useState(viewer.email ?? '')
  const [telephone, setTelephone] = useState(viewer.telephone ?? '')
  const [niveauEtude, setNiveauEtude] = useState(viewer.niveauEtude ?? '')
  const [situationEmploi, setSituationEmploi] = useState(viewer.situationEmploi ?? '')
  // GUIC-229 — CV en upload différé. Tant que la candidature n'est pas
  // soumise, on garde le `File` côté client (zéro blob créé). À la
  // soumission, on uploade le fichier puis on POST la candidature avec
  // son URL. Si un CV a déjà été uploadé (retry après échec serveur),
  // on conserve la meta pour ne pas créer un nouveau blob orphelin.
  const [cvFile, setCvFile] = useState<DeferredFile | null>(null)
  const [cvUploaded, setCvUploaded] = useState<UploadedFileMeta | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null)
  // GUIC-232 — état complétude profil (null = en cours de chargement).
  const [profilMissing, setProfilMissing] = useState<string[] | null>(null)
  // CV depuis profil (GUIC-223 / GUIC-224) — null = pas encore chargé, {cvUrl:null} = profil sans CV.
  const [profileCv, setProfileCv] = useState<ProfilCvData | null>(null)
  // Mode CV : 'profile' = réutilise le CV du profil, 'upload' = upload manuel.
  const [cvMode, setCvMode] = useState<'profile' | 'upload'>('upload')

  const lettreId = useId()
  const helperId = useId()
  const counterId = useId()
  const cguId = useId()
  // GUIC-361 — ids pour champs auto-fill additionnels.
  const emailId = useId()
  const telId = useId()
  const niveauId = useId()
  const situationId = useId()

  // Reset complet à la (re)fermeture pour éviter de réafficher l'écran succès
  // à la prochaine ouverture.
  useEffect(() => {
    if (!isOpen) {
      setLettre('')
      setConsent(false)
      setCvFile(null)
      setCvUploaded(null)
      setError(null)
      setSubmitted(null)
      setSending(false)
      setProfilMissing(null)
      setCvMode('upload')
      // GUIC-361 — réinitialise les champs auto-fill sur les valeurs profil.
      setEmail(viewer.email ?? '')
      setTelephone(viewer.telephone ?? '')
      setNiveauEtude(viewer.niveauEtude ?? '')
      setSituationEmploi(viewer.situationEmploi ?? '')
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

  // GUIC-224 — Récupère le CV stocké sur le profil pour proposer sa réutilisation.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('/api/profil/cv')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return
        const data = (body?.data ?? null) as ProfilCvData | null
        setProfileCv(data)
        // Si un CV est dispo, on bascule par défaut sur le mode 'profile' —
        // l'utilisateur peut toujours charger un autre via "Charger un nouveau CV".
        if (data?.cvUrl) setCvMode('profile')
      })
      .catch(() => {
        if (!cancelled) setProfileCv({ cvUrl: null, name: '', uploadedAt: null })
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const lettreOk = lettre.trim().length > 0
  const hasCv = cvFile !== null || cvUploaded !== null
  const cvOk = !requiresFileUpload || hasCv
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
    const hasData = lettre.trim().length > 0 || hasCv
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
  }, [submitted, lettre, hasCv, onClose])

  async function submit() {
    if (!canSubmit) return
    setSending(true)
    setError(null)
    try {
      // GUIC-229 — upload différé : on n'envoie le CV sur Vercel Blob
      // QU'AU submit (et au plus une fois — un retry réseau sur la
      // candidature ne déclenche pas un second blob).
      let cvMeta = cvUploaded
      if (!cvMeta && cvFile) {
        try {
          cvMeta = await uploader(cvFile.safeName, cvFile.file)
          setCvUploaded(cvMeta)
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Échec de l'upload du CV."
          setError(msg)
          setSending(false)
          return
        }
      }

      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportuniteId,
          lettreMotivation: lettre.trim() || undefined,
          notificationsConsent: consent,
          // Champs ajoutés par GUIC-218 — l'API actuelle ignore les
          // propriétés inconnues, donc rétrocompatible.
          cvUrl: cvMeta?.url,
          // GUIC-361 — snapshot des infos profil au moment de la candidature
          // (envoyées en formulaireData ; le backend stocke ce qu'il sait gérer).
          formulaireData: {
            email: email.trim() || null,
            telephone: telephone.trim() || null,
            niveauEtude: niveauEtude.trim() || null,
            situationEmploi: situationEmploi.trim() || null,
            competences: viewer.competences ?? [],
            domainesInteret: viewer.domainesInteret ?? [],
          },
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

  // Choix présentation : bottom-sheet mobile (< md), modal centrée desktop (≥ md).
  // GUIC-197 — design v2 WebApplyModal : modal centrée 680px sur desktop.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const title = `Postuler — ${opportuniteTitre}`

  // Écran succès — présenté dans le même conteneur responsive (modal desktop / sheet mobile).
  if (submitted) {
    const success = (
      <SuccessScreen
        refId={refCandidature(submitted.id)}
        opportuniteTitre={opportuniteTitre}
        telephone={viewer.telephone}
      />
    )
    return isDesktop ? (
      <Modal isOpen={isOpen} onClose={handleClose} title="Candidature envoyée" size="lg">
        {success}
      </Modal>
    ) : (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Candidature envoyée" variant="bottom">
        {success}
      </Sheet>
    )
  }

  const body = (
    <>
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
            href="/jeune/mon-profil"
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
          href="/jeune/mon-profil"
          data-testid="edit-profile-link"
          className="inline-block mt-space-2 text-fs-200 font-bold text-gj-teal-deep hover:underline"
        >
          Modifier dans mon profil →
        </Link>
      </div>

      {/* GUIC-361 — Coordonnées + parcours pré-remplis depuis le profil. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-3 mb-space-4">
        <div>
          <label htmlFor={emailId} className="text-fs-200 font-bold text-color-text-primary">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="candidature-email"
            placeholder="prenom.nom@exemple.sn"
            autoComplete="email"
            className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
              text-[16px] min-h-[44px] focus:outline-none focus:border-gj-teal-deep
              focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
          />
        </div>
        <div>
          <label htmlFor={telId} className="text-fs-200 font-bold text-color-text-primary">
            Téléphone
          </label>
          <input
            id={telId}
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            data-testid="candidature-telephone"
            placeholder="+221 77 123 45 67"
            autoComplete="tel"
            className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
              text-[16px] min-h-[44px] focus:outline-none focus:border-gj-teal-deep
              focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
          />
        </div>
        <div>
          <label htmlFor={niveauId} className="text-fs-200 font-bold text-color-text-primary">
            Niveau d&apos;études
          </label>
          <input
            id={niveauId}
            type="text"
            value={niveauEtude}
            onChange={(e) => setNiveauEtude(e.target.value)}
            data-testid="candidature-niveau-etude"
            placeholder="Bac+3, Licence, Master…"
            className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
              text-[16px] min-h-[44px] focus:outline-none focus:border-gj-teal-deep
              focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
          />
        </div>
        <div>
          <label htmlFor={situationId} className="text-fs-200 font-bold text-color-text-primary">
            Situation actuelle
          </label>
          <input
            id={situationId}
            type="text"
            value={situationEmploi}
            onChange={(e) => setSituationEmploi(e.target.value)}
            data-testid="candidature-situation"
            placeholder="Étudiant, en recherche, en emploi…"
            className="mt-space-1 w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
              text-[16px] min-h-[44px] focus:outline-none focus:border-gj-teal-deep
              focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]"
          />
        </div>
      </div>

      {/* GUIC-361 — Compétences depuis le profil (lecture seule, lien d'édition). */}
      {(viewer.competences?.length ?? 0) > 0 && (
        <div className="mb-space-4" data-testid="competences-section">
          <p className="text-fs-200 font-bold text-color-text-primary mb-space-1">
            Tes compétences
          </p>
          <p className="text-fs-100 text-color-text-muted mb-space-2">
            Issues de ton profil — elles seront transmises au recruteur.
          </p>
          <div className="flex flex-wrap gap-space-1">
            {(viewer.competences ?? []).map((c) => (
              <span
                key={c}
                data-testid="competence-chip"
                className="inline-flex items-center text-fs-100 font-bold
                  bg-gj-teal-soft text-gj-teal-deep px-space-2 py-1 rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

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
          data-testid="yaye-help-button"
          onClick={() => {
            // GUIC-224 — Deep-link vers Yaye avec le contexte de l'opportunité.
            // Yaye prendra le relais pour assister la rédaction de la lettre.
            const qs = opportuniteSlug
              ? `?from=postuler&opp=${encodeURIComponent(opportuniteSlug)}`
              : '?from=postuler'
            router.push(`/jeune/yaye${qs}`)
          }}
          className="inline-flex items-center gap-space-1 text-gj-teal-deep font-bold hover:underline"
        >
          <Icon name="sparkle" size={14} /> Yaye m&apos;aide
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

      {/* CV — GUIC-224/229 : carte « Utiliser mon CV de profil » si dispo, sinon
          FileUpload en upload différé (le fichier n'est poussé qu'au submit pour
          éviter les CV orphelins). Tout converge sur cvUploaded/cvFile (modèle #75). */}
      <div
        className="mt-space-4"
        aria-live="polite"
        data-testid="cv-section"
      >
        {profileCv?.cvUrl && cvMode === 'profile' ? (
          <div
            data-testid="profile-cv-card"
            className="rounded-gj-md border border-gj-line bg-white p-space-3"
          >
            <p className="text-fs-300 font-bold text-color-text-primary">
              CV{requiresFileUpload ? '' : ' (facultatif)'}
            </p>
            <div className="mt-space-2 flex items-start gap-space-2">
              <Icon name="document" size={20} />
              <div className="flex-1 min-w-0">
                <p className="text-fs-200 font-bold text-color-text-primary truncate">
                  {deduceCvName(profileCv.cvUrl, profileCv.name)}
                </p>
                <p className="text-fs-100 text-color-text-muted">
                  {profileCv.uploadedAt
                    ? `Ajouté le ${dateFmtCv.format(new Date(profileCv.uploadedAt))}`
                    : 'Stocké sur ton profil'}
                </p>
              </div>
            </div>
            <div className="mt-space-3 flex flex-wrap gap-space-2">
              <Button
                variant="primary"
                size="sm"
                data-testid="use-profile-cv-button"
                onClick={() => {
                  if (!profileCv.cvUrl) return
                  // CV de profil déjà hébergé → on le marque comme « uploadé »
                  // (aucun upload différé à refaire au submit).
                  setCvFile(null)
                  setCvUploaded({
                    url: profileCv.cvUrl,
                    name: deduceCvName(profileCv.cvUrl, profileCv.name),
                    sizeKb: 0,
                  })
                }}
              >
                Utiliser ce CV
              </Button>
              <button
                type="button"
                data-testid="upload-new-cv-button"
                onClick={() => {
                  setCvUploaded(null)
                  setCvFile(null)
                  setCvMode('upload')
                }}
                className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
              >
                Charger un nouveau CV
              </button>
            </div>
            {cvUploaded?.url === profileCv.cvUrl && (
              <p
                className="mt-space-2 text-fs-100 text-gj-green-ink inline-flex items-center gap-space-1"
                data-testid="profile-cv-selected"
              >
                <Icon name="check-circle" size={14} /> CV de profil sélectionné
              </p>
            )}
          </div>
        ) : (
          <>
            {/* GUIC-361 — Si pas de CV au profil, suggérer de l'ajouter une fois pour toutes. */}
            {profileCv !== null && !profileCv.cvUrl && (
              <div
                data-testid="no-profile-cv-hint"
                className="mb-space-2 rounded-gj-md bg-gj-yellow-soft text-color-text-primary
                  px-space-3 py-space-2 text-fs-100 flex items-start gap-space-2"
              >
                <Icon name="info" size={16} aria-hidden />
                <span>
                  Aucun CV trouvé sur ton profil.{' '}
                  <Link
                    href="/jeune/mon-profil"
                    className="font-bold text-gj-teal-deep hover:underline"
                  >
                    Ajoute-le à ton profil
                  </Link>{' '}
                  pour qu&apos;il soit pré-rempli automatiquement la prochaine fois.
                </span>
              </div>
            )}
            <FileUpload
              label={`CV${requiresFileUpload ? '' : ' (facultatif)'}`}
              mode="defer"
              onSelect={(deferred) => {
                setCvFile(deferred)
                // Tout changement de fichier invalide l'upload précédent (retry) ;
                // le blob déjà poussé expire (cacheControlMaxAge) et le cron GUIC-231 nettoie.
                setCvUploaded(null)
              }}
            />
          </>
        )}
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
          <Link href="/legal/cgu" className="text-gj-teal-deep font-bold hover:underline">
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
    </>
  )

  if (isDesktop) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
        {body}
      </Modal>
    )
  }

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} title={title} variant="bottom">
      {body}
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
          Candidature envoyée <span aria-hidden="true">🎉</span>
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
