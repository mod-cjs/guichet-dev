import { Icon } from '@/components/ui'
import type { MockCentre } from './mock-data'

export interface CentreListItemProps {
  centre: MockCentre
  onPrendreRdv?: (centreId: string) => void
  onItineraire?: (centreId: string) => void
}

/**
 * CentreListItem — row d'un centre dans la liste mobile.
 *
 * - `isPrimary` : carte étendue (badge "Mon centre", services, CTAs).
 * - sinon : row compact (nom + distance + horaires).
 */
export function CentreListItem({ centre, onPrendreRdv, onItineraire }: CentreListItemProps) {
  const distLabel =
    centre.distanceKm < 10 ? `${centre.distanceKm.toFixed(1)} km` : `${Math.round(centre.distanceKm)} km`

  if (centre.isPrimary) {
    return (
      <article
        aria-label={`${centre.nom} (mon centre)`}
        className="bg-white rounded-gj-lg p-space-3 flex flex-col gap-space-2"
        style={{ border: '1.5px solid var(--gj-teal)' }}
      >
        <span
          className="self-start text-[10px] font-bold px-2 py-[2px] rounded-gj-pill uppercase tracking-wide bg-gj-teal-soft text-gj-teal-deep"
        >
          Mon centre · {distLabel}
        </span>
        <div className="flex gap-space-3 items-start">
          <div className="flex-shrink-0 w-11 h-11 rounded-gj-md bg-gj-teal-soft text-gj-teal-deep inline-flex items-center justify-center">
            <Icon name="pin" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-fs-400 font-bold">{centre.nom}</div>
            <div className="text-fs-200 text-gj-grey leading-snug mt-[2px]">
              {centre.adresse}
              <br />
              {centre.ville}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-fs-200 text-gj-grey">
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ background: centre.ouvert ? 'var(--gj-green)' : 'var(--gj-grey-2)' }}
                />
                {centre.horaires}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="users" size={12} />
                {centre.conseillers} conseillers
              </span>
            </div>
          </div>
        </div>
        <ul className="flex flex-wrap gap-1 list-none p-0 m-0">
          {centre.services.map((s) => (
            <li
              key={s}
              className="text-[10.5px] font-semibold text-gj-grey bg-gj-bg px-2 py-[3px] rounded-gj-pill"
              style={{ border: '1px solid var(--gj-line)' }}
            >
              {s}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => onPrendreRdv?.(centre.id)}
            className="flex-1 inline-flex items-center justify-center gap-1 bg-gj-teal-deep text-white font-bold text-fs-300 px-3 py-[10px] rounded-gj-md cursor-pointer"
          >
            <Icon name="calendar" size={14} /> Prendre RDV
          </button>
          <button
            type="button"
            onClick={() => onItineraire?.(centre.id)}
            className="inline-flex items-center gap-1 bg-white text-gj-teal-deep font-bold text-fs-300 px-3 py-[10px] rounded-gj-md cursor-pointer"
            style={{ border: '1.5px solid var(--gj-line)' }}
          >
            <Icon name="pin" size={14} /> Itinéraire
          </button>
        </div>
      </article>
    )
  }

  return (
    <article
      aria-label={centre.nom}
      className="bg-white rounded-gj-lg p-space-3 flex items-center gap-space-3"
      style={{ border: '1.5px solid var(--gj-line)' }}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-gj-md bg-gj-bg text-gj-grey inline-flex items-center justify-center">
        <Icon name="pin" size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <div className="text-fs-300 font-bold truncate">{centre.nom}</div>
          <span className="text-[10.5px] font-bold text-gj-teal-deep flex-shrink-0">{distLabel}</span>
        </div>
        <div className="text-fs-200 text-gj-grey mt-[2px] truncate">
          {centre.adresse} · {centre.ville}
        </div>
        <div className="flex items-center gap-1 text-[10.5px] text-gj-grey mt-1">
          <span
            className="w-[6px] h-[6px] rounded-full"
            style={{ background: centre.ouvert ? 'var(--gj-green)' : 'var(--gj-grey-2)' }}
          />
          <span>
            {centre.ouvert ? 'Ouvert' : 'Fermé'} · {centre.horaires}
          </span>
        </div>
      </div>
    </article>
  )
}
