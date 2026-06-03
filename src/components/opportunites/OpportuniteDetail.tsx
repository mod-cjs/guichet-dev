'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Button, Toast } from '@/components/ui'
import { OpportuniteTypeChip, typeLabel } from './OpportuniteTypeChip'
import { HeartIcon } from './OpportunityCard'
import { useFavoris } from './FavorisProvider'
import { formatDeadline, formatDeadlineFull } from '@/lib/format-date'
import type { ViewerInfo } from './CandidatureModal'
import type { OpportuniteDetail as Detail } from '@/types/candidature'
import type { CandidatureListItem } from '@/types/candidature'

interface OpportuniteDetailProps {
  detail: Detail
  viewer: ViewerInfo | null
}

/** Seuil "urgent" pour le badge fusionné — aligné avec OppCard mais centré sur le détail. */
export const URGENT_DAYS_THRESHOLD = 3
const DAY = 86_400_000

const humanize = (v: string) => v.replace(/_/g, ' ')

// Modal chargé en lazy : on remplace le contenu par un skeleton léger
// pendant l'hydratation pour donner un feedback immédiat au clic "Postuler".
const CandidatureModal = dynamic(
  () => import('./CandidatureModal').then((m) => m.CandidatureModal),
  { ssr: false },
)

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

function KeyFact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="bg-gj-bg rounded-gj-md px-space-3 py-space-2" title={title}>
      <p className="text-fs-100 uppercase font-bold text-color-text-muted tracking-wide">{label}</p>
      <p className="text-fs-300 font-bold text-color-text-primary mt-[2px]">{value}</p>
    </div>
  )
}

/**
 * Calcule l'état d'urgence (J ≤ URGENT_DAYS_THRESHOLD) + libellé compact
 * pour le badge fusionné "TYPE · CLÔTURE J-N".
 */
function buildClotureSuffix(iso: string | null, now: number = Date.now()):
  { suffix: string; urgent: boolean } | null {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - now) / DAY)
  if (days < 0) return { suffix: 'CLÔTURÉE', urgent: true }
  if (days === 0) return { suffix: "CLÔTURE AUJOURD'HUI", urgent: true }
  if (days <= URGENT_DAYS_THRESHOLD) return { suffix: `CLÔTURE J-${days}`, urgent: true }
  if (days <= 7) return { suffix: `CLÔTURE J-${days}`, urgent: false }
  return null
}

/** Contenu du détail d'une opportunité — partagé entre la page SSR et le slide-over. */
export function OpportuniteDetail({ detail, viewer }: OpportuniteDetailProps) {
  const searchParams = useSearchParams()
  const expired = detail.deadline !== null && new Date(detail.deadline) < new Date()
  const { has: isFavoriOf, toggle: toggleFavoriId } = useFavoris()
  const isFavori = isFavoriOf(detail.id)

  const [modalOpen, setModalOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [dejaCandidate, setDejaCandidate] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // État par-utilisateur : a-t-il déjà candidaté ?
  useEffect(() => {
    if (!viewer) return
    fetch('/api/candidatures')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.data?.some((c: CandidatureListItem) => c.opportuniteSlug === detail.slug)) {
          setDejaCandidate(true)
        }
      })
      .catch(() => {})
  }, [viewer, detail.slug])

  // Ré-ouverture du formulaire après connexion (?postuler=1).
  useEffect(() => {
    if (viewer && !expired && !dejaCandidate && searchParams.get('postuler') === '1') {
      setModalOpen(true)
    }
  }, [viewer, expired, dejaCandidate, searchParams])

  // Dès que le modal est monté/ouvert, on retire l'état "Ouverture…".
  useEffect(() => {
    if (modalOpen) setIsOpening(false)
  }, [modalOpen])

  const toggleFavori = useCallback(() => {
    toggleFavoriId(detail.id)
  }, [toggleFavoriId, detail.id])

  const handlePostuler = useCallback(() => {
    setIsOpening(true)
    // Préchargement explicite du chunk modal + ouverture.
    import('./CandidatureModal').finally(() => {
      setModalOpen(true)
    })
  }, [])

  const share = useCallback(() => {
    const url = `${window.location.origin}/opportunites/${detail.slug}`
    if (navigator.share) {
      navigator.share({ title: detail.titre, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).then(
        () => setToast({ message: 'Lien copié', type: 'success' }),
        () => {},
      )
    }
  }, [detail.slug, detail.titre])

  const cloture = useMemo(() => buildClotureSuffix(detail.deadline), [detail.deadline])
  // Badge unique : "STAGE · CLÔTURE J-3" quand cloture présente, sinon juste le type.
  const badgeTone: 'red' | undefined = cloture?.urgent || expired ? 'red' : undefined

  const facts: { label: string; value: string; title?: string }[] = [
    { label: 'Type', value: humanize(detail.type) },
    { label: 'Domaine', value: humanize(detail.domaine) },
  ]
  if (detail.region) facts.push({ label: 'Région', value: humanize(detail.region) })
  if (detail.remuneration) facts.push({ label: 'Rémunération', value: detail.remuneration })
  facts.push({
    label: 'Échéance',
    value: detail.deadline ? formatDeadline(detail.deadline) : 'Sans échéance',
    title: detail.deadline ? formatDeadlineFull(detail.deadline) : undefined,
  })

  return (
    <article className="flex flex-col gap-space-4">
      <header className="flex flex-col gap-space-2">
        {/* Badge fusionné — une seule pill compacte (GUIC-221 #1). */}
        <div className="flex" data-testid="detail-badge">
          <OpportuniteTypeChip
            type={detail.type}
            tone={badgeTone}
            suffix={expired ? 'CLÔTURÉE' : cloture?.suffix}
            leadingIcon={badgeTone === 'red' ? 'alert' : undefined}
          />
        </div>
        <h1 className="text-fs-600 font-black text-color-text-primary">{detail.titre}</h1>
        <p className="text-fs-300 text-color-text-secondary">{detail.organisation}</p>
      </header>

      <div className="grid grid-cols-2 gap-space-2">
        {facts.map((f) => (
          <KeyFact key={f.label} label={f.label} value={f.value} title={f.title} />
        ))}
      </div>

      <div>
        <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-1">Description</h2>
        <p className="text-fs-300 text-color-text-primary leading-loose whitespace-pre-line">
          {detail.description}
        </p>
      </div>

      {detail.lienExterne && (
        <a
          href={detail.lienExterne}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fs-300 font-bold text-gj-teal-deep underline"
        >
          Plus d’informations
        </a>
      )}

      {/* Barre d'actions — collante, séparée du contenu qui défile dessous */}
      <div className="flex flex-wrap gap-space-2 sticky bottom-0 bg-white py-space-3
        border-t border-gj-line">
        {!viewer ? (
          <a
            href="/api/auth/login"
            className="flex-1 min-w-[160px] inline-flex items-center justify-center
              bg-gj-teal text-white font-bold rounded-gj-md min-h-[var(--tap-comfortable)] px-space-4"
          >
            Se connecter pour postuler
          </a>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="flex-1 min-w-[160px]"
            disabled={expired || dejaCandidate}
            loading={isOpening}
            onClick={handlePostuler}
            data-testid="postuler-cta"
            aria-label={isOpening ? 'Ouverture du formulaire de candidature' : undefined}
          >
            {dejaCandidate
              ? 'Déjà candidaté'
              : expired
              ? 'Candidatures closes'
              : isOpening
              ? 'Ouverture…'
              : 'Postuler'}
          </Button>
        )}
        <button
          type="button"
          onClick={toggleFavori}
          aria-pressed={isFavori}
          aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`inline-flex items-center justify-center gap-2 rounded-gj-md font-bold
            text-fs-300 px-space-4 min-h-[var(--tap-comfortable)] border-[1.5px]
            transition-colors cursor-pointer
            ${
              isFavori
                ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep'
                : 'bg-white border-gj-teal-deep text-gj-teal-deep hover:bg-gj-teal-soft'
            }`}
        >
          <HeartIcon filled={isFavori} />
          {isFavori ? 'Sauvegardée' : 'Sauvegarder'}
        </button>
        <Button variant="ghost" size="lg" onClick={share} aria-label="Partager">
          <ShareIcon />
          <span className="sr-only md:not-sr-only">Partager</span>
        </Button>
      </div>

      {viewer && modalOpen && (
        <CandidatureModal
          opportuniteId={detail.id}
          opportuniteSlug={detail.slug}
          opportuniteTitre={detail.titre}
          viewer={viewer}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            setDejaCandidate(true)
            setToast({ message: 'Candidature envoyée', type: 'success' })
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Marqueur sémantique : type lisible pour SEO/SR sous le badge majuscule. */}
      <span className="sr-only">Type d’opportunité : {typeLabel(detail.type)}</span>
    </article>
  )
}
