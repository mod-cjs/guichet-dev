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
  /** Adresse postale complète (rue + quartier). Si absente, on retombe sur `ville ?? region`. */
  addr?: string
  services: string[]
  conseillersCount: number
  estActif: boolean
  horaires?: CentreRowHoraire[]
  /** Distance utilisateur en km. Si `undefined`, le badge n'est pas affiché
   *  (on n'a pas encore la géoloc visiteur côté serveur). */
  km?: number
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

const MAX_SERVICES = 5

function formatHoraireToday(horaires?: CentreRowHoraire[]): string {
  if (!horaires || horaires.length === 0) return 'Horaires non communiqués'
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const jour = days[new Date().getDay()]
  const row = horaires.find((h) => h.jour === jour)
  if (!row || !row.ouvert) return 'Fermé aujourd’hui'
  if (row.ouvreA && row.fermeA) return `${row.ouvreA} – ${row.fermeA}`
  return 'Ouvert'
}

function formatKm(km?: number): string | null {
  if (km === undefined || km === null) return null
  if (Number.isNaN(km)) return null
  // 1 décimale, sauf si entier ≥10
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`
}

/**
 * <CentreRow> — ligne d'annuaire centre (desktop vue `all`).
 *
 * Refonte fidèle au design source `public/design-v2/centres-web.jsx` (l.25-49) :
 *  - Pin 46×46 à gauche (teal-soft si `mine`, gj-bg sinon)
 *  - Header inline : nom · badge "Mon centre" (teal-soft) · spacer · km (teal-deep)
 *  - Sous-ligne : `addr · region`
 *  - Meta : OpenDot · horaires · conseillers
 *  - 5 services max + "+N"
 *  - Card : padding 15px, bordure 1.5px teal si `mine` sinon line
 *  - Chips services : fond gj-bg, texte gj-grey, border gj-line
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
  const kmLabel = formatKm(centre.km)
  const subline = centre.addr
    ? `${centre.addr} · ${centre.region}`
    : (centre.ville ?? centre.region)

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
      className={`relative flex gap-3.5 rounded-gj-lg cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`.trim()}
      style={{
        background: 'var(--gj-surface)',
        border: isMine ? '1.5px solid var(--gj-teal)' : '1.5px solid var(--gj-line)',
        padding: 15,
        alignItems: 'flex-start',
      }}
    >
      {/* Pin gauche 46×46 */}
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 46,
          height: 46,
          borderRadius: 11,
          background: isMine ? 'var(--gj-teal-soft)' : 'var(--gj-bg)',
          color: isMine ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
        }}
      >
        <Icon name="pin" size={22} />
      </span>

      <div className="flex-1 min-w-0">
        <header className="flex flex-wrap items-center gap-2">
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
                fontSize: 9.5,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                background: 'var(--gj-teal-soft)',
                color: 'var(--gj-teal-deep)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              Mon centre
            </span>
          )}
          <span style={{ flex: 1 }} />
          {kmLabel && (
            <span
              className="font-black flex-shrink-0"
              style={{
                fontSize: 12,
                color: 'var(--gj-teal-deep)',
                whiteSpace: 'nowrap',
              }}
            >
              {kmLabel}
            </span>
          )}
        </header>

        <div
          style={{ color: 'var(--gj-grey)', fontSize: 12.5, marginTop: 3 }}
        >
          {subline}
        </div>

        <div
          className="flex flex-wrap items-center"
          style={{ gap: 14, marginTop: 7, color: 'var(--gj-grey)', fontSize: 12.5 }}
        >
          <span className="inline-flex items-center" style={{ gap: 5, fontWeight: 600, color: isOpen ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>
            <CentreOpenDot open={isOpen} />
            {isOpen ? 'Ouvert' : 'Fermé'}
          </span>
          <span className="inline-flex items-center" style={{ gap: 6, fontWeight: 600 }}>
            <Icon name="clock" size={14} aria-hidden="true" />
            {horaireToday}
          </span>
          <span className="inline-flex items-center" style={{ gap: 6, fontWeight: 600 }}>
            <Icon name="users" size={14} aria-hidden="true" />
            {centre.conseillersCount}{' '}
            {centre.conseillersCount > 1 ? 'conseillers' : 'conseiller'}
          </span>
        </div>

        {shownServices.length > 0 && (
          <ul
            className="flex flex-wrap"
            aria-label="Services"
            style={{ gap: 6, marginTop: 9 }}
          >
            {shownServices.map((s) => (
              <li
                key={s}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--gj-bg)',
                  color: 'var(--gj-grey)',
                  border: '1px solid var(--gj-line)',
                }}
              >
                {s}
              </li>
            ))}
            {extraServices > 0 && (
              <li
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 4px',
                  color: 'var(--gj-grey-2)',
                }}
              >
                +{extraServices}
              </li>
            )}
          </ul>
        )}
      </div>
    </article>
  )
}
