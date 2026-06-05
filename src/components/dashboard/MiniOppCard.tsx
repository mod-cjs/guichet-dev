import Link from 'next/link'

export type MiniOppTone = 'teal' | 'yellow' | 'red' | 'blue'

export interface MiniOpp {
  id:     string
  titre:  string
  org:    string
  /** Pastille catégorie/urgence (ex. "J-3 · URGENT"). */
  tag?:   string
  tone?:  MiniOppTone
  /** Pastille match (ex. "92% match"). */
  match?: string
  /** URL détail opportunité. */
  href:   string
}

export interface MiniOppCardProps {
  opp:     MiniOpp
  /** Largeur fixe (mobile carousel). Si absent, fluide. */
  widthPx?: number
}

const TONE_TAG: Record<MiniOppTone, string> = {
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  red:    'bg-gj-red-soft text-gj-red-ink',
  blue:   'bg-gj-blue-soft text-gj-blue-ink',
}

/**
 * Mini-card d'opportunité utilisée UNIQUEMENT dans le carousel "Recommandées"
 * du dashboard. Visuel simplifié — ne pas confondre avec la card complète
 * du module Opportunités (gérée par GUIC-188).
 */
export function MiniOppCard({ opp, widthPx }: MiniOppCardProps) {
  const tone = opp.tone ?? 'teal'
  return (
    <Link
      href={opp.href}
      className="block bg-white border-[1.5px] border-gj-line rounded-gj-lg p-space-3 flex-shrink-0
        hover:shadow-gj-md transition-shadow duration-200 snap-start"
      style={widthPx ? { width: widthPx } : undefined}
    >
      <div className="flex flex-col gap-space-2">
        {opp.tag && (
          <span
            className={`self-start text-[10px] font-black uppercase tracking-wider px-space-2 py-[2px] rounded-full ${TONE_TAG[tone]}`}
          >
            {opp.tag}
          </span>
        )}
        <div className="text-fs-300 font-extrabold leading-snug text-gj-ink line-clamp-2">
          {opp.titre}
        </div>
        <div className="text-fs-100 text-gj-grey leading-snug line-clamp-2">{opp.org}</div>
        {opp.match && (
          <span className="self-start text-[10px] font-black uppercase tracking-wider px-space-2 py-[2px] rounded-full bg-gj-green-soft text-gj-green-ink mt-1">
            {opp.match}
          </span>
        )}
      </div>
    </Link>
  )
}
