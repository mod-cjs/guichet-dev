'use client'

import { CentreOpenDot } from '../CentreOpenDot'

export interface CentreCardMobileHoraire {
  jour: string
  ouvert: boolean
  ouvreA?: string | null
  fermeA?: string | null
}

export interface CentreCardMobileCentre {
  id: string
  slug: string
  nom: string
  region: string
  ville?: string
  horaires?: CentreCardMobileHoraire[]
}

export interface CentreCardMobileProps {
  centre: CentreCardMobileCentre
  isMine?: boolean
  isOpen?: boolean
  onClick?: () => void
  className?: string
}

function formatHoraireToday(horaires?: CentreCardMobileHoraire[]): string {
  if (!horaires || horaires.length === 0) return 'Horaires non communiqués'
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const jour = days[new Date().getDay()]
  const row = horaires.find((h) => h.jour === jour)
  if (!row || !row.ouvert) return 'Fermé aujourd’hui'
  if (row.ouvreA && row.fermeA) return `${row.ouvreA} – ${row.fermeA}`
  return 'Ouvert'
}

/**
 * <CentreCardMobile> — variante mobile compacte de l'annuaire centres.
 *
 * Tap-min 44px, pas de chips services (gain place), pin + nom + statut ouvert.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 2.
 */
export function CentreCardMobile({
  centre,
  isMine = false,
  isOpen = false,
  onClick,
  className = '',
}: CentreCardMobileProps) {
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
      className={`w-full flex items-start gap-3 p-3 rounded-gj-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`.trim()}
      style={{
        minHeight: 44,
        background: 'var(--gj-surface, #fff)',
        border: `1px solid ${
          isMine ? 'var(--gj-teal-deep, #0A2A24)' : 'var(--gj-line, #DDE3E1)'
        }`,
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          background: 'var(--gj-teal-soft, #E5F0EC)',
          color: 'var(--gj-teal-deep, #0A2A24)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h3
            className="text-fs-300 font-bold m-0 truncate"
            style={{ color: 'var(--gj-ink, #0E1A1F)' }}
          >
            {centre.nom}
          </h3>
          {isMine && (
            <span
              className="text-fs-100 font-bold px-1.5 py-0.5 rounded-gj-sm flex-shrink-0"
              style={{
                background: 'var(--gj-teal-deep, #0A2A24)',
                color: '#fff',
              }}
            >
              Mien
            </span>
          )}
        </div>
        <div
          className="text-fs-100"
          style={{ color: 'var(--gj-grey, #65706B)' }}
        >
          {centre.ville ?? centre.region}
        </div>
        <div className="flex items-center gap-1.5 text-fs-100" style={{ color: 'var(--gj-grey, #65706B)' }}>
          <CentreOpenDot open={isOpen} />
          <span>{isOpen ? 'Ouvert' : 'Fermé'} · {formatHoraireToday(centre.horaires)}</span>
        </div>
      </div>
    </article>
  )
}
