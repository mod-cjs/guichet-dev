import Link from 'next/link'
import { MiniOppCard, type MiniOpp } from './MiniOppCard'

export interface OpportunitesRecoCarouselProps {
  /** Liste d'opportunités recommandées (3–5 idéalement). */
  opps:      MiniOpp[]
  /** Titre affiché au-dessus. */
  title?:    string
  /** Sous-titre/lede. */
  lede?:     string
  /** Lien "Voir tout". */
  seeAll?:   string
  /** Largeur des cards en mobile carousel (px). */
  cardWidth?: number
}

/**
 * Carousel horizontal d'opportunités recommandées affiché sur le dashboard.
 *
 * - Mobile : scroll horizontal avec snap. Cards en largeur fixe.
 * - Desktop (≥ md) : grille fluide 2–3 colonnes, plus de scroll horizontal.
 *
 * Note : pas d'`overflow-x-auto` sur un container de navigation (interdit par
 * CLAUDE.md). Ici le scroll s'applique uniquement à une liste de contenu —
 * conforme aux règles UI.
 */
export function OpportunitesRecoCarousel({
  opps,
  title  = 'Pour toi',
  lede,
  seeAll = '/opportunites',
  cardWidth = 260,
}: OpportunitesRecoCarouselProps) {
  if (opps.length === 0) return null

  return (
    <section aria-label="Opportunités recommandées">
      <header className="flex items-baseline justify-between mb-space-3">
        <div>
          <h2 className="text-fs-400 font-black text-gj-ink">{title}</h2>
          {lede && <p className="text-fs-200 text-gj-grey mt-1">{lede}</p>}
        </div>
        {seeAll && (
          <Link
            href={seeAll}
            className="text-fs-200 font-black text-gj-teal-deep hover:underline whitespace-nowrap"
          >
            Voir tout →
          </Link>
        )}
      </header>

      <div
        className="flex gap-space-3 overflow-x-auto pb-space-2 snap-x snap-mandatory
          md:overflow-x-visible md:snap-none md:grid md:grid-cols-2 lg:grid-cols-3"
      >
        {opps.map((opp) => (
          <MiniOppCard key={opp.id} opp={opp} widthPx={cardWidth} />
        ))}
      </div>
    </section>
  )
}
