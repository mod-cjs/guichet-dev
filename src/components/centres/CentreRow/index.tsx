'use client'

import { CentreOpenDot } from '../CentreOpenDot'

export interface CentreRowHoraire {
  jour: string
  ouvert: boolean
  ouvreA?: string | null
  fermeA?: string | null
}

export interface CentreRowCentre {
  id: string
  slug: string
  nom: string
  region: string
  ville?: string
  services: string[]
  conseillersCount: number
  estActif: boolean
  horaires?: CentreRowHoraire[]
}

export interface CentreRowProps {
  centre: CentreRowCentre
  /** Si user.centrePrincipalId === centre.id. */
  isMine?: boolean
  /** Calculé par parent depuis horaires + heure courante. */
  isOpen?: boolean
  onClick?: () => void
  className?: string
}

const MAX_SERVICES = 3

function formatHoraireToday(horaires?: CentreRowHoraire[]): string {
  if (!horaires || horaires.length === 0) return 'Horaires non communiqués'
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const jour = days[new Date().getDay()]
  const row = horaires.find((h) => h.jour === jour)
  if (!row || !row.ouvert) return 'Fermé aujourd’hui'
  if (row.ouvreA && row.fermeA) return `${row.ouvreA} – ${row.fermeA}`
  return 'Ouvert'
}

/**
 * <CentreRow> — ligne d'annuaire centre (desktop vue `all`).
 *
 * Carte cliquable navigant vers `/centres/[slug]`. Border teal-deep si
 * `isMine` (centre principal du user). Affiche horaire du jour, services
 * (3 max + "+N"), nombre de conseillers.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 2.
 */
export function CentreRow({
  centre,
  isMine = false,
  isOpen = false,
  onClick,
  className = '',
}: CentreRowProps) {
  const horaireToday = formatHoraireToday(centre.horaires)
  const extraServices = centre.services.length - MAX_SERVICES
  const shownServices = centre.services.slice(0, MAX_SERVICES)

  const handleClick = () => {
    if (onClick) onClick()
  }
  const handleKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Voir le centre ${centre.nom}`}
      data-mine={isMine ? 'true' : 'false'}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={`relative flex flex-col gap-2 p-4 rounded-gj-lg cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`.trim()}
      style={{
        background: 'var(--gj-surface, #fff)',
        border: `1px solid ${
          isMine ? 'var(--gj-teal-deep, #0A2A24)' : 'var(--gj-line, #DDE3E1)'
        }`,
        boxShadow: isMine ? '0 0 0 1px var(--gj-teal-deep, #0A2A24) inset' : undefined,
      }}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-fs-300 font-black m-0" style={{ color: 'var(--gj-ink, #0E1A1F)' }}>
          {centre.nom}
        </h3>
        {isMine && (
          <span
            className="text-fs-100 font-bold px-2 py-0.5 rounded-gj-sm"
            style={{
              background: 'var(--gj-teal-deep, #0A2A24)',
              color: '#fff',
            }}
          >
            Mon centre
          </span>
        )}
      </header>

      <div className="flex items-center gap-3 text-fs-200" style={{ color: 'var(--gj-grey, #65706B)' }}>
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
          </svg>
          {centre.ville ?? centre.region} · {centre.region}
        </span>
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <CentreOpenDot open={isOpen} />
          <span>{isOpen ? 'Ouvert' : 'Fermé'} · {horaireToday}</span>
        </span>
      </div>

      {shownServices.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Services">
          {shownServices.map((s) => (
            <li
              key={s}
              className="text-fs-100 px-2 py-0.5 rounded-gj-sm"
              style={{
                background: 'var(--gj-teal-soft, #E5F0EC)',
                color: 'var(--gj-teal-deep, #0A2A24)',
              }}
            >
              {s}
            </li>
          ))}
          {extraServices > 0 && (
            <li
              className="text-fs-100 px-2 py-0.5 rounded-gj-sm"
              style={{ color: 'var(--gj-grey, #65706B)' }}
            >
              +{extraServices}
            </li>
          )}
        </ul>
      )}

      <footer className="text-fs-100" style={{ color: 'var(--gj-grey, #65706B)' }}>
        {centre.conseillersCount}{' '}
        {centre.conseillersCount > 1 ? 'conseillers disponibles' : 'conseiller disponible'}
      </footer>
    </article>
  )
}
