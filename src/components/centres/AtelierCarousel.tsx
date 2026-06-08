import { Icon } from '@/components/ui'
import type { MockAtelier, AtelierTone } from './mock-data'

export interface AtelierCarouselProps {
  ateliers: MockAtelier[]
  onInscrire?: (atelierId: string) => void
}

const TONE_DATE_BG: Record<AtelierTone, string> = {
  yellow: 'var(--gj-yellow-soft)',
  blue: 'var(--gj-blue-soft)',
  teal: 'var(--gj-teal-soft)',
}
const TONE_DATE_INK: Record<AtelierTone, string> = {
  yellow: 'var(--gj-yellow-ink)',
  blue: 'var(--gj-blue-ink)',
  teal: 'var(--gj-teal-deep)',
}

/**
 * AtelierCarousel — scroll horizontal d'ateliers à venir au centre primary.
 *
 * Note design : sur mobile l'overflow-x est volontaire ici (composant carrousel,
 * pas un container de navigation — la règle "jamais d'overflow-x-auto sur nav"
 * ne s'applique pas). `snap-x` aide à l'UX tactile.
 */
export function AtelierCarousel({ ateliers, onInscrire }: AtelierCarouselProps) {
  return (
    <div
      data-testid="atelier-carousel"
      role="list"
      aria-label="Ateliers à venir à mon centre"
      className="flex gap-space-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-space-3 px-space-3"
      style={{ scrollbarWidth: 'thin' }}
    >
      {ateliers.map((a) => (
        <article
          key={a.id}
          role="listitem"
          className="bg-white rounded-gj-lg p-space-3 flex items-center gap-space-3 flex-shrink-0 snap-start"
          style={{ border: '1.5px solid var(--gj-line)', width: 'min(86vw, 340px)' }}
        >
          <div
            className="text-center rounded-gj-sm py-1 px-1 flex-shrink-0"
            style={{
              width: 50,
              background: TONE_DATE_BG[a.tone],
              color: TONE_DATE_INK[a.tone],
            }}
          >
            <div className="text-fs-400 font-black leading-none">{a.jourNum}</div>
            <div className="text-[9px] font-bold tracking-wide mt-[2px]">{a.moisLabel}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-fs-300 font-bold leading-snug">{a.titre}</div>
            <div className="text-fs-200 text-gj-grey mt-[2px]">{a.horaires}</div>
          </div>
          <button
            type="button"
            onClick={() => onInscrire?.(a.id)}
            aria-label={`S'inscrire à ${a.titre}`}
            className="bg-transparent text-gj-teal-deep font-bold text-fs-200 inline-flex items-center gap-1 cursor-pointer"
          >
            S&apos;inscrire <Icon name="arrow-right" size={12} />
          </button>
        </article>
      ))}
    </div>
  )
}
