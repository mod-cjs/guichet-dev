'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Icon, Toast } from '@/components/ui'
import { CandidatureModal, type ViewerInfo } from './CandidatureModal'
import { useFavoris } from './FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'
import type { CandidatureListItem } from '@/types/candidature'

interface OpportuniteDetailProps {
  detail: Detail
  viewer: ViewerInfo | null
}

type TabKey = 'details' | 'criteres' | 'postuler' | 'organisation'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const humanize = (v: string) => v.replace(/_/g, ' ')

/** Wrapper compatibilité — utilise sprite SVG global (GUIC-205-D). */
function ShareIcon() {
  return <Icon name="share" size={20} aria-hidden />
}

/** Calcule J-N pour la deadline ; null si > 30j ou inexistante. */
function joursAvantDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  const j = Math.ceil(ms / 86_400_000)
  if (j < 0 || j > 30) return null
  return j
}

/**
 * GUIC-189 — Détail opportunité v2 (mobile-first).
 *
 * Mobile : hero compact + tabs (Détails / Critères / Comment postuler /
 * Organisation) + sticky CTA. Desktop : même contenu, le slide-over enveloppe
 * tout via `<Sheet variant="side">` au niveau du parent (route `@modal`).
 */
export function OpportuniteDetail({ detail, viewer }: OpportuniteDetailProps) {
  const searchParams = useSearchParams()
  const expired = detail.deadline !== null && new Date(detail.deadline) < new Date()
  const { has: isFavoriOf, toggle: toggleFavoriId } = useFavoris()
  const isFavori = isFavoriOf(detail.id)

  const [tab, setTab] = useState<TabKey>('details')
  const [modalOpen, setModalOpen] = useState(false)
  const [dejaCandidate, setDejaCandidate] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

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

  useEffect(() => {
    if (viewer && !expired && !dejaCandidate && searchParams.get('postuler') === '1') {
      setModalOpen(true)
    }
  }, [viewer, expired, dejaCandidate, searchParams])

  const toggleFavori = useCallback(() => {
    toggleFavoriId(detail.id)
  }, [toggleFavoriId, detail.id])

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

  const jAvant = useMemo(() => joursAvantDeadline(detail.deadline), [detail.deadline])

  const facts = useMemo(() => {
    const out: { label: string; value: string }[] = []
    if (detail.region) out.push({ label: 'Région', value: humanize(detail.region) })
    if (detail.remuneration) out.push({ label: 'Rémunération', value: detail.remuneration })
    out.push({
      label: 'Échéance',
      value: detail.deadline ? dateFmt.format(new Date(detail.deadline)) : 'Sans échéance',
    })
    return out
  }, [detail])

  const onApplyClick = () => {
    if (!viewer) {
      window.location.href = `/api/auth/login?redirect=/opportunites/${detail.slug}?postuler=1`
      return
    }
    if (dejaCandidate || expired) return
    setModalOpen(true)
  }

  return (
    <article className="flex flex-col gap-space-4 pb-[calc(var(--tap-comfortable)+var(--space-4))]">
      {/* Hero — coin coloré, titre, organisation, badges deadline / type */}
      <header className="rounded-gj-lg bg-gradient-to-br from-gj-teal-deep to-gj-ink-teal
        text-white px-space-4 py-space-4 flex flex-col gap-space-2">
        <div className="flex items-center gap-space-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-fs-100 font-black uppercase
              tracking-wide rounded-gj-pill px-space-2 py-[2px] bg-white/15 text-white"
          >
            {humanize(detail.type)}
          </span>
          {jAvant !== null && (
            <span
              className={`inline-flex items-center gap-1 text-fs-100 font-black uppercase
                tracking-wide rounded-gj-pill px-space-2 py-[2px]
                ${jAvant <= 3 ? 'bg-gj-red text-white' : 'bg-gj-yellow text-gj-ink'}`}
            >
              Clôture J-{jAvant}
            </span>
          )}
          {detail.programme && (
            <span className="inline-flex text-fs-100 font-bold rounded-gj-pill
              px-space-2 py-[2px] bg-white/10 text-white">
              {detail.programme.nom}
            </span>
          )}
        </div>
        <h1 className="text-fs-600 font-black leading-tight">{detail.titre}</h1>
        <p className="text-fs-300 opacity-90">{detail.organisation}</p>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Sections de l'opportunité"
        className="flex gap-space-1 border-b border-gj-line">
        {(
          [
            { k: 'details', l: 'Détails' },
            { k: 'criteres', l: 'Critères' },
            { k: 'postuler', l: 'Comment postuler' },
            { k: 'organisation', l: 'Organisation' },
          ] as const
        ).map(({ k, l }) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            id={`tab-${k}`}
            onClick={() => setTab(k)}
            className={`px-space-3 py-space-2 text-fs-200 font-bold border-b-2 -mb-[1px]
              transition-colors cursor-pointer whitespace-nowrap
              ${
                tab === k
                  ? 'border-gj-teal-deep text-gj-teal-deep'
                  : 'border-transparent text-color-text-muted hover:text-color-text-primary'
              }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === 'details' && (
        <section
          id="panel-details"
          role="tabpanel"
          aria-labelledby="tab-details"
          className="flex flex-col gap-space-3"
        >
          <div className="grid grid-cols-2 gap-space-2">
            {facts.map((f) => (
              <div key={f.label} className="bg-gj-bg rounded-gj-md px-space-3 py-space-2">
                <p className="text-fs-100 uppercase font-bold text-color-text-muted tracking-wide">
                  {f.label}
                </p>
                <p className="text-fs-300 font-bold text-color-text-primary mt-[2px]">
                  {f.value}
                </p>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-1">
              Description
            </h2>
            <p className="text-fs-300 text-color-text-primary leading-loose whitespace-pre-line">
              {detail.description}
            </p>
          </div>
        </section>
      )}

      {tab === 'criteres' && (
        <section
          id="panel-criteres"
          role="tabpanel"
          aria-labelledby="tab-criteres"
          className="flex flex-col gap-space-3"
        >
          <div>
            <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-2">
              Compétences requises
            </h2>
            {detail.skills.length === 0 ? (
              <p className="text-fs-300 text-color-text-muted">
                Aucune compétence spécifique listée.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-space-1" aria-label="Compétences">
                {detail.skills.map((s) => (
                  <li
                    key={s.slug}
                    className={`inline-flex items-center gap-1 rounded-gj-pill px-space-3
                      min-h-[34px] text-fs-200 font-bold border-[1.5px]
                      ${
                        s.requise
                          ? 'bg-gj-teal-soft border-gj-teal-deep text-gj-teal-deep'
                          : 'bg-gj-surface border-gj-line text-color-text-primary'
                      }`}
                  >
                    {s.libelle}
                    {s.requise && (
                      <span className="text-gj-red" aria-label="(requise)">
                        *
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {detail.tags.length > 0 && (
            <div>
              <h3 className="text-fs-300 font-bold text-color-text-primary mb-space-1">
                Tags
              </h3>
              <ul className="flex flex-wrap gap-space-1" aria-label="Tags">
                {detail.tags.map((t) => (
                  <li
                    key={t.slug}
                    className="inline-flex items-center rounded-gj-pill px-space-3 min-h-[30px]
                      text-fs-100 font-bold border-[1.5px] border-gj-line bg-gj-surface
                      text-color-text-primary"
                  >
                    {t.libelle}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === 'postuler' && (
        <section
          id="panel-postuler"
          role="tabpanel"
          aria-labelledby="tab-postuler"
          className="flex flex-col gap-space-3"
        >
          <ol className="text-fs-300 text-color-text-primary leading-loose
            list-decimal list-inside flex flex-col gap-space-1">
            <li>Vérifier que votre profil CJS est à jour.</li>
            <li>
              Rédiger une lettre de motivation
              {detail.requiresFileUpload
                ? ` et joindre votre ${detail.fileLabel ?? 'CV'} au format PDF.`
                : ' (CV facultatif).'}
            </li>
            <li>Valider l’envoi via le bouton « {detail.actionLabel ?? 'Postuler'} ».</li>
            <li>Vous recevrez une confirmation WhatsApp/SMS.</li>
          </ol>
          {detail.lienExterne && (
            <a
              href={detail.lienExterne}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fs-300 font-bold text-gj-teal-deep underline"
            >
              Plus d’informations sur le site de l’organisation ↗
            </a>
          )}
        </section>
      )}

      {tab === 'organisation' && (
        <section
          id="panel-organisation"
          role="tabpanel"
          aria-labelledby="tab-organisation"
          className="flex flex-col gap-space-2"
        >
          <h2 className="text-fs-400 font-bold text-color-text-primary">
            {detail.organisation}
          </h2>
          <p className="text-fs-300 text-color-text-secondary">
            Domaine : {humanize(detail.domaine)}
          </p>
          {detail.programme && (
            <p className="text-fs-300 text-color-text-secondary">
              Programme : {detail.programme.nom}
            </p>
          )}
        </section>
      )}

      {/* Sticky CTA */}
      <div
        className="flex flex-wrap gap-space-2 sticky bottom-0 bg-white py-space-3
          border-t border-gj-line"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <Button
          variant="primary"
          size="lg"
          className="flex-1 min-w-[160px]"
          disabled={Boolean(viewer) && (expired || dejaCandidate)}
          onClick={onApplyClick}
        >
          {!viewer
            ? 'Se connecter pour postuler'
            : dejaCandidate
              ? 'Déjà candidaté'
              : expired
                ? 'Candidatures closes'
                : (detail.actionLabel ?? 'Postuler')}
        </Button>
        <button
          type="button"
          onClick={toggleFavori}
          aria-pressed={isFavori}
          aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`inline-flex items-center justify-center gap-2 rounded-gj-md font-bold
            text-fs-300 px-space-3 min-h-[var(--tap-comfortable)] border-[1.5px]
            transition-colors cursor-pointer
            ${
              isFavori
                ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep'
                : 'bg-white border-gj-teal-deep text-gj-teal-deep hover:bg-gj-teal-soft'
            }`}
        >
          <Icon name="bookmark" size={22} aria-hidden style={{ fill: isFavori ? 'currentColor' : 'none' }} />
          <span className="sr-only">
            {isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </span>
        </button>
        <Button variant="ghost" size="lg" onClick={share} aria-label="Partager">
          <ShareIcon />
          <span className="sr-only md:not-sr-only">Partager</span>
        </Button>
      </div>

      {viewer && (
        <CandidatureModal
          opportuniteId={detail.id}
          opportuniteTitre={detail.titre}
          requiresFileUpload={detail.requiresFileUpload}
          fileLabel={detail.fileLabel}
          viewer={viewer}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
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
{/* Export factice pour permettre l'icône Share globale en cas de besoin */}
export { ShareIcon as __ShareIcon }
