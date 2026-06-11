'use client'

import { Icon } from '@/components/ui/Icon'
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

const MAX_SERVICES = 2

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
 * Carte cliquable navigant vers `/centres/[slug]`. Densité accrue :
 *  - padding `12px 14px` (≈ design source)
 *  - border-left 4px gj-yellow si `isMine` (au lieu de border full teal-deep)
 *  - badge "MON CENTRE" jaune/teal-deep uppercase
 *  - 2 services max + "+N" si plus
 *  - meta single-line (ville · horaire · conseillers)
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
      className={`relative flex flex-col gap-1.5 rounded-gj-lg cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`.trim()}
      style={{
        background: 'var(--gj-surface)',
        border: '1px solid var(--gj-line)',
        borderLeft: isMine ? '4px solid var(--gj-yellow)' : '1px solid var(--gj-line)',
        padding: '12px 14px',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <h3
          className="font-black m-0"
          style={{ color: 'var(--gj-ink)', fontSize: 15, lineHeight: 1.25 }}
        >
          {centre.nom}
        </h3>
        {isMine && (
          <span
            className="font-black flex-shrink-0"
            style={{
              fontSize: 10,
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              background: 'var(--gj-yellow)',
              color: 'var(--gj-teal-deep)',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            Mon centre
          </span>
        )}
      </header>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
        style={{ color: 'var(--gj-grey)', fontSize: 12 }}
      >
        <span className="inline-flex items-center gap-1">
          <Icon name="pin" size={13} aria-hidden="true" />
          {centre.ville ?? centre.region}
        </span>
        <span className="inline-flex items-center gap-1">
          <CentreOpenDot open={isOpen} />
          <span>{isOpen ? 'Ouvert' : 'Fermé'} · {horaireToday}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="users" size={13} aria-hidden="true" />
          {centre.conseillersCount}{' '}
          {centre.conseillersCount > 1 ? 'conseillers' : 'conseiller'}
        </span>
      </div>

      {shownServices.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Services">
          {shownServices.map((s) => (
            <li
              key={s}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--gj-teal-soft)',
                color: 'var(--gj-teal-deep)',
              }}
            >
              {s}
            </li>
          ))}
          {extraServices > 0 && (
            <li
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                color: 'var(--gj-grey)',
              }}
            >
              +{extraServices}
            </li>
          )}
        </ul>
      )}
    </article>
  )
}
