'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Toast } from '@/components/ui'
import { CandidatureModal, type ViewerInfo } from './CandidatureModal'
import type { OpportuniteDetail as Detail } from '@/types/candidature'
import type { CandidatureListItem } from '@/types/candidature'

interface OpportuniteDetailProps {
  detail: Detail
  viewer: ViewerInfo | null
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const humanize = (v: string) => v.replace(/_/g, ' ')

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gj-bg rounded-gj-md px-space-3 py-space-2">
      <p className="text-fs-100 uppercase font-bold text-color-text-muted tracking-wide">{label}</p>
      <p className="text-fs-300 font-bold text-color-text-primary mt-[2px]">{value}</p>
    </div>
  )
}

/** Contenu du détail d'une opportunité — partagé entre la page SSR et le slide-over. */
export function OpportuniteDetail({ detail, viewer }: OpportuniteDetailProps) {
  const searchParams = useSearchParams()
  const expired = detail.deadline !== null && new Date(detail.deadline) < new Date()

  const [modalOpen, setModalOpen] = useState(false)
  const [dejaCandidate, setDejaCandidate] = useState(false)
  const [isFavori, setIsFavori] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // État par-utilisateur : a-t-il déjà candidaté / mis en favori ?
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
    fetch('/api/favoris')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.data?.some((o: { id: string }) => o.id === detail.id)) setIsFavori(true)
      })
      .catch(() => {})
  }, [viewer, detail.slug, detail.id])

  // Ré-ouverture du formulaire après connexion (?postuler=1).
  useEffect(() => {
    if (viewer && !expired && !dejaCandidate && searchParams.get('postuler') === '1') {
      setModalOpen(true)
    }
  }, [viewer, expired, dejaCandidate, searchParams])

  const toggleFavori = useCallback(() => {
    if (!viewer) {
      setToast({ message: 'Connectez-vous pour sauvegarder', type: 'info' })
      return
    }
    const was = isFavori
    setIsFavori(!was)
    const req = was
      ? fetch(`/api/favoris/${detail.id}`, { method: 'DELETE' })
      : fetch('/api/favoris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opportuniteId: detail.id }),
        })
    req
      .then((r) => {
        if (!r.ok) throw new Error()
      })
      .catch(() => {
        setIsFavori(was)
        setToast({ message: 'Action impossible, réessayez', type: 'error' })
      })
  }, [viewer, isFavori, detail.id])

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

  const facts: { label: string; value: string }[] = [
    { label: 'Type', value: humanize(detail.type) },
    { label: 'Domaine', value: humanize(detail.domaine) },
  ]
  if (detail.region) facts.push({ label: 'Région', value: humanize(detail.region) })
  if (detail.remuneration) facts.push({ label: 'Rémunération', value: detail.remuneration })
  facts.push({
    label: 'Échéance',
    value: detail.deadline ? dateFmt.format(new Date(detail.deadline)) : 'Sans échéance',
  })

  return (
    <article className="flex flex-col gap-space-4">
      <header>
        <h1 className="text-fs-600 font-black text-color-text-primary">{detail.titre}</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">{detail.organisation}</p>
      </header>

      <div className="grid grid-cols-2 gap-space-2">
        {facts.map((f) => (
          <KeyFact key={f.label} label={f.label} value={f.value} />
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

      {/* Barre d'actions */}
      <div className="flex flex-wrap gap-space-2 sticky bottom-0 bg-white py-space-2">
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
            onClick={() => setModalOpen(true)}
          >
            {dejaCandidate ? 'Déjà candidaté' : expired ? 'Candidatures closes' : 'Postuler'}
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={toggleFavori}>
          {isFavori ? 'Sauvegardé' : 'Sauvegarder'}
        </Button>
        <Button variant="ghost" size="lg" onClick={share}>
          Partager
        </Button>
      </div>

      {viewer && (
        <CandidatureModal
          opportuniteId={detail.id}
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
    </article>
  )
}
