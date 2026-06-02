import { Icon } from '@/components/ui'
import type { MockRdv } from './mock-data'

export interface RdvCardProps {
  rdv: MockRdv
  onItineraire?: () => void
  onReporter?: () => void
}

/**
 * RdvCard — carte du prochain rendez-vous au centre (yellow gradient).
 *
 * MVP : data mock — aucune API de prise de rendez-vous n'existe encore (cf. spec).
 */
export function RdvCard({ rdv, onItineraire, onReporter }: RdvCardProps) {
  return (
    <article
      aria-label={`Prochain rendez-vous : ${rdv.titre}`}
      className="rounded-gj-lg p-space-3 flex items-center gap-space-3"
      style={{
        background: 'linear-gradient(135deg, var(--gj-yellow-soft), var(--gj-surface))',
        border: '1.5px solid var(--gj-yellow)',
      }}
    >
      <div
        className="flex-shrink-0 text-center rounded-gj-md py-2 px-1 bg-white"
        style={{ width: 56, border: '1.5px solid var(--gj-yellow)' }}
      >
        <div
          className="text-[9px] font-black uppercase tracking-wide"
          style={{ color: 'var(--gj-yellow-ink)' }}
        >
          {rdv.jourLabel}
        </div>
        <div className="text-fs-600 font-black leading-none mt-[1px] text-color-text-primary">
          {rdv.jourNum}
        </div>
        <div className="text-[9px] font-bold mt-[1px] text-gj-grey">{rdv.moisLabel}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-fs-300 font-bold text-color-text-primary">
          {rdv.titre} · {rdv.heure}
        </div>
        <div className="text-fs-200 text-gj-grey mt-[2px]">
          {rdv.conseillere} · {rdv.centre}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onItineraire}
            className="inline-flex items-center gap-1 px-3 py-[7px] rounded-gj-sm font-bold text-fs-200 bg-gj-teal-deep text-white cursor-pointer"
          >
            <Icon name="pin" size={12} /> Itinéraire
          </button>
          <button
            type="button"
            onClick={onReporter}
            className="inline-flex items-center px-3 py-[7px] rounded-gj-sm font-bold text-fs-200 bg-white text-gj-teal-deep cursor-pointer"
            style={{ border: '1.5px solid var(--gj-line)' }}
          >
            Reporter
          </button>
        </div>
      </div>
    </article>
  )
}
