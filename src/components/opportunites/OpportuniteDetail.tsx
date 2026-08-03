'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Button, Icon, RichContent, Toast } from '@/components/ui'
import type { ViewerInfo } from './CandidatureModal'
import { useFavoris } from './FavorisProvider'
import { YayeMatchCard } from './YayeMatchCard'
import { ProgrammeBadges } from './ProgrammeBadges'
import type { OpportuniteDetail as Detail } from '@/types/candidature'
import type { CandidatureListItem } from '@/types/candidature'
import {
  DEADLINE_VISIBLE_DAYS,
  MS_PER_DAY,
  URGENT_DAYS_THRESHOLD,
} from '@/lib/constants/candidature'
import { loginUrl, opportuniteSlugUrl } from '@/lib/routes'
import { categorieDepuisType, classeCategorie } from '@/lib/design/categories'

// Lazy-load le formulaire de candidature : il n'est jamais nécessaire au premier
// rendu (anonyme ou avant clic CTA). Bénéfice mesuré attendu : ~25 KB gzip
// économisés sur le bundle de la page slug pour les visiteurs anonymes.
const CandidatureModal = dynamic(
  () => import('./CandidatureModal').then((m) => m.CandidatureModal),
  { ssr: false },
)

interface OpportuniteDetailProps {
  detail: Detail
  viewer: ViewerInfo | null
  /** Si le détail est rendu dans un slide-over, affiche un bouton « Fermer » dans le hero. */
  onClose?: () => void
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const humanize = (v: string) => v.replace(/_/g, ' ').toLowerCase()

/**
 * Nombre de jours restants avant la deadline (peut être négatif si dépassée).
 * Constantes partagées : `MS_PER_DAY`, `DEADLINE_VISIBLE_DAYS` / `URGENT_DAYS_THRESHOLD`
 * pour les bornes d'affichage. Source : `src/lib/constants/candidature.ts`.
 */
function joursAvantDeadline(deadlineIso: string | null): number | null {
  if (!deadlineIso) return null
  const diff = new Date(deadlineIso).getTime() - Date.now()
  return Math.ceil(diff / MS_PER_DAY)
}

interface HeroBadgeProps {
  typeLabel: string
  deadlineIso: string | null
  expired: boolean
}

/**
 * Pastilles du hero — GUIC-691, conformité v5 (Lot 3 + Lot 14 normatif).
 *
 * v5 sépare ce que la v3 fusionnait : la CATÉGORIE porte sa couleur propre
 * (`--cat-*`, déduite du type), l'URGENCE d'échéance vit dans sa propre pastille
 * rouge. Les fusionner revenait à peindre en rouge le type d'une offre qui
 * expire — or en v5 le rouge ne dit qu'une chose : « ça ferme bientôt ».
 */
function HeroBadges({ typeLabel, deadlineIso, expired }: HeroBadgeProps) {
  const jours = joursAvantDeadline(deadlineIso)
  const visible = jours !== null && jours <= DEADLINE_VISIBLE_DAYS
  const urgent = expired || (jours !== null && jours <= URGENT_DAYS_THRESHOLD)

  let deadlineLabel: string | null = null
  if (expired) deadlineLabel = 'CLÔTURÉE'
  else if (jours === null) deadlineLabel = null
  else if (jours <= 0) deadlineLabel = 'CLÔTURE AUJOURD’HUI'
  else if (visible) deadlineLabel = `CLÔTURE J-${jours}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span data-testid="opp-categorie" className={classeCategorie(categorieDepuisType(typeLabel))}>
        {typeLabel}
      </span>
      {deadlineLabel && urgent && (
        <span data-testid="opp-urgence" className="gj-urgent">
          <span className="w-[6px] h-[6px] rounded-full bg-white" aria-hidden />
          {deadlineLabel}
        </span>
      )}
      {deadlineLabel && !urgent && (
        <span
          data-testid="opp-echeance"
          className="inline-flex items-center gap-1 text-fs-100 font-extrabold
            bg-white/15 text-white px-space-2 py-1 rounded-full"
        >
          {deadlineLabel}
        </span>
      )}
    </div>
  )
}

/** Bouton ghost rond du hero (close / share / bookmark). */
function HeroGhostButton({
  iconName,
  label,
  filled,
  onClick,
  ariaPressed,
}: {
  iconName: 'close' | 'share' | 'bookmark' | 'heart'
  label: string
  filled?: boolean
  onClick: () => void
  ariaPressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={ariaPressed}
      className={`w-9 h-9 rounded-full inline-flex items-center justify-center
        border-[1.5px] border-white/30 text-white cursor-pointer
        ${filled ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icon name={iconName} size={16} aria-hidden />
    </button>
  )
}

/** Cellule de la grille de détails 2 colonnes. */
function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gj-bg rounded-gj-md px-space-3 py-space-2">
      <p className="text-fs-100 uppercase font-bold text-color-text-muted tracking-wide">{label}</p>
      <p className="text-fs-300 font-bold text-color-text-primary mt-[2px]">{value}</p>
    </div>
  )
}

/** Contenu du détail d'une opportunité — partagé entre la page SSR et le slide-over. */
export function OpportuniteDetail({ detail, viewer, onClose }: OpportuniteDetailProps) {
  const searchParams = useSearchParams()
  const expired = detail.deadline !== null && new Date(detail.deadline) < new Date()
  const { has: isFavoriOf, toggle: toggleFavoriId } = useFavoris()
  const isFavori = isFavoriOf(detail.id)

  const [modalOpen, setModalOpen] = useState(false)
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

  const toggleFavori = useCallback(() => {
    toggleFavoriId(detail.id)
  }, [toggleFavoriId, detail.id])

  const share = useCallback(() => {
    const url = `${window.location.origin}${opportuniteSlugUrl(detail.slug)}`
    if (navigator.share) {
      navigator.share({ title: detail.titre, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).then(
        () => setToast({ message: 'Lien copié', type: 'success' }),
        () => {},
      )
    }
  }, [detail.slug, detail.titre])

  // Chips meta inline du hero (région / rémunération / délai indicatif).
  const heroChips = useMemo(() => {
    const chips: { icon: 'pin' | 'funding' | 'clock'; label: string }[] = []
    if (detail.region) chips.push({ icon: 'pin', label: humanize(detail.region) })
    if (detail.remuneration) chips.push({ icon: 'funding', label: detail.remuneration })
    const jours = joursAvantDeadline(detail.deadline)
    if (jours !== null && jours > 0 && jours <= DEADLINE_VISIBLE_DAYS) {
      chips.push({ icon: 'clock', label: `Décision ${jours}j` })
    }
    return chips
  }, [detail.region, detail.remuneration, detail.deadline])

  // Grille détails 2 colonnes — racine + sous-type discriminé.
  const cells = useMemo(() => {
    const out: { label: string; value: string }[] = [
      { label: 'Type', value: humanize(detail.type) },
      { label: 'Domaine', value: humanize(detail.domaine) },
    ]
    if (detail.region) out.push({ label: 'Région', value: humanize(detail.region) })
    if (detail.remuneration) out.push({ label: 'Rémunération', value: detail.remuneration })
    out.push({
      label: 'Échéance',
      value: detail.deadline ? dateFmt.format(new Date(detail.deadline)) : 'Sans échéance',
    })
    // Sous-type : ajoute quelques champs lisibles si présents.
    if (detail.details?.type === 'emploi') {
      out.push({ label: 'Type de contrat', value: humanize(detail.details.payload.typeContrat) })
      if (detail.details.payload.teletravail) {
        out.push({ label: 'Modalité', value: 'Télétravail possible' })
      }
    }
    if (detail.details?.type === 'stage') {
      out.push({ label: 'Durée', value: `${detail.details.payload.dureeMois} mois` })
    }
    if (detail.details?.type === 'formation') {
      out.push({ label: 'Modalité', value: humanize(detail.details.payload.modalite) })
    }
    return out
  }, [detail])

  const competencesRequises = (detail.skills ?? []).filter((s) => s.requise)
  const tags = detail.tags ?? []

  const ctaDisabled = expired || dejaCandidate
  const ctaLabel = dejaCandidate
    ? 'Déjà candidaté'
    : expired
      ? 'Candidatures closes'
      : (detail.actionLabel ?? 'Postuler maintenant')
  const ctaDisabledReason = dejaCandidate
    ? 'Vous avez déjà candidaté à cette opportunité.'
    : expired
      ? 'Les candidatures pour cette opportunité sont closes.'
      : ''

  return (
    <article className="flex flex-col">
      {/* ─── Hero compact ────────────────────────────────────────────── */}
      <header
        className="text-white px-space-4 pt-space-2 pb-space-4 rounded-gj-md"
        style={{
          background: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal, var(--gj-teal-deep)))',
        }}
      >
        <div className="flex items-center justify-between mb-space-3">
          {onClose ? (
            <HeroGhostButton iconName="close" label="Fermer" onClick={onClose} />
          ) : (
            <span aria-hidden className="w-9 h-9" />
          )}
          <div className="flex gap-space-2">
            <HeroGhostButton iconName="share" label="Partager" onClick={share} />
            <HeroGhostButton
              iconName={isFavori ? 'heart' : 'bookmark'}
              label={isFavori ? 'Retirer des favoris' : 'Sauvegarder'}
              filled={isFavori}
              ariaPressed={isFavori}
              onClick={toggleFavori}
            />
          </div>
        </div>

        <HeroBadges typeLabel={humanize(detail.type)} deadlineIso={detail.deadline} expired={expired} />

        <h1
          className="text-color-text-onDark mt-space-2 font-black"
          style={{ fontSize: 'var(--fs-700)', lineHeight: 1.2, color: '#fff' }}
        >
          {detail.titre}
        </h1>
        <p className="text-fs-200 opacity-90 mt-1">
          <b>{detail.organisation}</b>
          {detail.region ? <> · {humanize(detail.region)}</> : null}
        </p>

        {/* GUIC-684 — de quel programme CJS relève cette offre. */}
        <div className="mt-space-2">
          <ProgrammeBadges programmes={detail.programmes ?? []} surFondSombre />
        </div>

        {heroChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-space-3">
            {heroChips.map((c) => (
              <span
                key={c.icon}
                className="inline-flex items-center gap-1 text-fs-100 font-semibold
                  bg-white/15 text-white px-space-2 py-1 rounded-full"
              >
                <Icon name={c.icon} size={12} aria-hidden />
                {c.label}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ─── Contenu défilant (scroll unique — plus de tabs) ─────────── */}
      <div className="flex flex-col gap-space-4 mt-space-4">
        <YayeMatchCard />

        <section aria-labelledby="opp-details-heading">
          <h2
            id="opp-details-heading"
            className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
          >
            Détails de l’offre
          </h2>
          <div className="grid grid-cols-2 gap-space-2">
            {cells.map((c) => (
              <DetailCell key={c.label} label={c.label} value={c.value} />
            ))}
          </div>
        </section>

        <section aria-labelledby="opp-description-heading">
          <h2
            id="opp-description-heading"
            className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
          >
            Description
          </h2>
          <RichContent html={detail.description} className="text-fs-300 leading-loose" />
        </section>

        {/* GUIC-257 — sections structurées optionnelles (null si non remplies en BDD). */}
        {detail.profilRecherche && (
          <section aria-labelledby="opp-profil-recherche-heading">
            <h2
              id="opp-profil-recherche-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
            >
              Profil recherché
            </h2>
            <RichContent html={detail.profilRecherche} className="text-fs-300 leading-loose" />
          </section>
        )}
        {detail.mission && (
          <section aria-labelledby="opp-mission-heading">
            <h2
              id="opp-mission-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
            >
              Mission
            </h2>
            <RichContent html={detail.mission} className="text-fs-300 leading-loose" />
          </section>
        )}
        {detail.conditions && (
          <section aria-labelledby="opp-conditions-heading">
            <h2
              id="opp-conditions-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
            >
              Conditions
            </h2>
            <RichContent html={detail.conditions} className="text-fs-300 leading-loose" />
          </section>
        )}

        {competencesRequises.length > 0 && (
          <section aria-labelledby="opp-skills-heading">
            <h2
              id="opp-skills-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
            >
              Compétences requises
            </h2>
            <ul className="list-disc pl-5 text-fs-300 text-color-text-primary leading-loose">
              {competencesRequises.map((s) => (
                <li key={s.slug}>{s.libelle}</li>
              ))}
            </ul>
          </section>
        )}

        {tags.length > 0 && (
          <section aria-labelledby="opp-tags-heading">
            <h2
              id="opp-tags-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-muted tracking-wide mb-space-2"
            >
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.slug}
                  className="inline-flex items-center text-fs-200 font-semibold
                    bg-gj-bg text-color-text-primary px-space-2 py-1 rounded-full"
                >
                  {t.libelle}
                </span>
              ))}
            </div>
          </section>
        )}

        {detail.lienExterne && (
          <a
            href={detail.lienExterne}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fs-300 font-bold text-gj-teal-deep underline self-start"
          >
            Plus d’informations
          </a>
        )}
      </div>

      {/* ─── Sticky CTA ──────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 z-10 bg-white border-t border-gj-line
          flex items-center gap-space-2 px-space-3 py-space-3 mt-space-4
          pb-[calc(theme(spacing.space-3)+env(safe-area-inset-bottom,0px))]"
      >
        <button
          type="button"
          onClick={toggleFavori}
          aria-pressed={isFavori}
          aria-label={isFavori ? 'Retirer des favoris' : 'Sauvegarder'}
          className={`flex-shrink-0 w-[50px] h-[50px] rounded-gj-md inline-flex items-center
            justify-center border-[1.5px] cursor-pointer transition-colors
            ${
              isFavori
                ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep'
                : 'bg-white border-gj-line text-gj-teal-deep hover:bg-gj-teal-soft'
            }`}
        >
          <Icon name="bookmark" size={18} aria-hidden />
        </button>

        {/* Bouton Partager — desktop seulement (mobile : ghost du hero). */}
        <button
          type="button"
          onClick={share}
          aria-label="Partager"
          className="hidden md:inline-flex flex-shrink-0 w-[50px] h-[50px] rounded-gj-md
            items-center justify-center border-[1.5px] border-gj-line bg-white
            text-gj-teal-deep hover:bg-gj-teal-soft cursor-pointer"
        >
          <Icon name="share" size={18} aria-hidden />
        </button>

        {!viewer ? (
          <a
            href={loginUrl(`${opportuniteSlugUrl(detail.slug)}?postuler=1`)}
            className="gj-cta flex-1"
          >
            Se connecter pour postuler
            <Icon name="arrow-right" size={16} aria-hidden />
          </a>
        ) : (
          <>
            <Button
              variant="conversion"
              size="lg"
              className="flex-1"
              disabled={ctaDisabled}
              aria-describedby={ctaDisabled ? 'cta-disabled-reason' : undefined}
              onClick={() => setModalOpen(true)}
            >
              {ctaLabel}
              {!ctaDisabled && <Icon name="arrow-right" size={16} aria-hidden />}
            </Button>
            {ctaDisabled && (
              <span id="cta-disabled-reason" className="sr-only">
                {ctaDisabledReason}
              </span>
            )}
          </>
        )}
      </div>

      {viewer && modalOpen && (
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
