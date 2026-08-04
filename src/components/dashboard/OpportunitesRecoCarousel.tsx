import type { TypeOpportunite } from '@prisma/client'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { OpportuniteTypeChip } from '@/components/opportunites/OpportuniteTypeChip'
import { TYPE_ICON, catFamilyOf, type CatFamily } from '@/components/opportunites/opportunite-type-meta'

/** Seuil d'urgence d'échéance — au-delà, aucune pastille rouge (règle v5). */
const URGENCE_JOURS = 7

export interface OppRecoCard {
  id:        string
  /** Type d'offre : porte la CATÉGORIE (couleur + icône), jamais l'urgence. */
  type:      TypeOpportunite
  /** Jours avant clôture ; `null` si pas d'échéance connue. */
  joursRestants?: number | null
  title:     string
  org:       string
  meta?:     { icon: IconName; label: string }[]
  match?:    string
  href:      string
  ctaLabel?: string
}

interface Props {
  items:    OppRecoCard[]
  title?:   string
  lede?:    string
  seeAllHref?: string
}

/**
 * Classes de la tuile sectorielle, écrites EN TOUTES LETTRES : Tailwind scanne
 * les sources en statique, une classe composée à l'exécution
 * (`bg-${famille}-soft`) ne serait jamais générée dans le CSS final.
 */
const CAT_TUILE_CLASSES: Record<CatFamily, string> = {
  'cat-emploi':      'bg-cat-emploi-soft text-cat-emploi-ink',
  'cat-stage':       'bg-cat-stage-soft text-cat-stage-ink',
  'cat-formation':   'bg-cat-formation-soft text-cat-formation-ink',
  'cat-financement': 'bg-cat-financement-soft text-cat-financement-ink',
  'cat-evenement':   'bg-cat-evenement-soft text-cat-evenement-ink',
  'cat-volontariat': 'bg-cat-volontariat-soft text-cat-volontariat-ink',
  'cat-neutre':      'bg-cat-neutre-soft text-cat-neutre-ink',
}

/**
 * OpportunitesRecoCarousel — carrousel horizontal de cards d'opportunités
 * recommandées (clôture imminente + match score).
 *
 * Référence : design-guichet-v2/web-dashboard.jsx (L.638-646)
 */
export function OpportunitesRecoCarousel({
  items,
  title = 'À ne pas rater',
  lede  = 'Clôture imminente · sélection pour ton profil',
  seeAllHref = '/opportunites',
}: Props) {
  return (
    <section aria-label={title}>
      <header className="flex items-baseline justify-between mb-space-3">
        <div>
          <h2 className="text-fs-500 font-black">{title}</h2>
          {lede && (
            <p className="text-fs-200 text-color-text-secondary mt-space-1">{lede}</p>
          )}
        </div>
        <Link
          href={seeAllHref}
          className="text-fs-200 font-black text-gj-teal-deep hover:underline"
        >
          Voir tout →
        </Link>
      </header>
      {items.length === 0 ? (
        <div className="bg-gj-surface border border-gj-line rounded-gj-md p-space-5
          text-center text-color-text-secondary text-fs-300">
          Aucune opportunité à recommander pour l&apos;instant.
        </div>
      ) : (
        <ul
          className="flex gap-space-3 overflow-x-auto pb-space-2 snap-x snap-mandatory
            xl:grid xl:grid-cols-3 2xl:grid-cols-4 xl:auto-rows-fr
            xl:overflow-visible xl:snap-none xl:pb-0"
        >
          {items.map((o) => (
            <li
              key={o.id}
              className="snap-start flex-shrink-0 w-[280px] xl:w-auto xl:flex-shrink"
            >
              <Link
                href={o.href}
                className="h-full bg-gj-surface border border-gj-line rounded-gj-md
                  flex flex-col overflow-hidden hover:border-gj-teal-deep
                  transition-colors"
              >
                {/* Tuile sectorielle — aplat de la famille catégorie + picto
                    (P1 audit UX : le dashboard ne doit plus être un mur de
                    texte). Aplat, jamais dégradé (consigne projet). */}
                <div
                  data-testid="reco-tuile"
                  className={`flex items-center justify-center h-[54px] ${CAT_TUILE_CLASSES[catFamilyOf(o.type)]}`}
                >
                  <Icon name={TYPE_ICON[o.type]} size={26} role="presentation" aria-hidden />
                </div>

                <div className="p-space-4 flex flex-col gap-space-2 flex-1">
                  {/* Deux pastilles DISTINCTES : la catégorie porte la couleur
                      de sa famille, l'urgence (rouge) reste séparée. */}
                  <div className="flex items-center gap-space-1 flex-wrap">
                    <OpportuniteTypeChip type={o.type} />
                    {typeof o.joursRestants === 'number' && o.joursRestants <= URGENCE_JOURS && (
                      <span
                        data-testid="reco-urgence"
                        className="text-fs-100 font-black px-space-2 py-space-1 rounded-full
                          uppercase tracking-wider bg-gj-red text-white"
                      >
                        {o.joursRestants === 0 ? "Aujourd'hui" : `J-${o.joursRestants}`}
                      </span>
                    )}
                  </div>
                <div className="text-fs-300 font-black leading-tight">{o.title}</div>
                <div className="text-fs-100 text-color-text-secondary leading-snug">
                  {o.org}
                </div>
                {o.meta && o.meta.length > 0 && (
                  <ul className="flex flex-wrap gap-space-2 mt-space-1 text-fs-100
                    text-color-text-secondary">
                    {o.meta.map((m, i) => (
                      <li key={i} className="inline-flex items-center gap-space-1">
                        <Icon name={m.icon} size={11} />
                        {m.label}
                      </li>
                    ))}
                  </ul>
                )}
                {o.match && (
                  <span className="self-start text-fs-100 font-black bg-gj-green-soft
                    text-gj-green-ink px-space-2 py-space-1 rounded-full mt-space-1
                    uppercase tracking-wider">
                    {o.match}
                  </span>
                )}
                {o.ctaLabel && (
                  <span className="mt-auto inline-flex items-center justify-center
                    gap-space-2 bg-gj-surface border-[1.5px] border-gj-line-strong
                    text-gj-teal-deep px-space-3 py-space-2
                    rounded-gj-md font-black text-fs-200 min-h-[var(--tap-min)]">
                    {o.ctaLabel}
                  </span>
                )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
