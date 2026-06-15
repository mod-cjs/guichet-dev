import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

export type OppTone = 'urgent' | 'cjs' | 'partner' | 'info' | 'success'

export interface OppRecoCard {
  id:        string
  tag:       string
  tone:      OppTone
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

const toneStyles: Record<OppTone, string> = {
  urgent:  'bg-gj-red-soft text-gj-red-ink',
  cjs:     'bg-gj-teal-soft text-gj-teal-deep',
  partner: 'bg-gj-yellow-soft text-gj-yellow-ink',
  info:    'bg-gj-blue-soft text-gj-blue-ink',
  success: 'bg-gj-green-soft text-gj-green-ink',
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
                  p-space-4 flex flex-col gap-space-2 hover:border-gj-teal-deep
                  transition-colors"
              >
                <span
                  className={`self-start text-fs-100 font-black px-space-2 py-space-1
                    rounded-full uppercase tracking-wider ${toneStyles[o.tone]}`}
                >
                  {o.tag}
                </span>
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
                    gap-space-2 bg-gj-teal-deep text-white px-space-3 py-space-2
                    rounded-gj-md font-black text-fs-200">
                    {o.ctaLabel}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
