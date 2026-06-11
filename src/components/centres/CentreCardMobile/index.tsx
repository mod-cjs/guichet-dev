'use client'

import { Icon } from '@/components/ui/Icon'
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
 * Densité accrue :
 *  - padding `10px 12px`
 *  - meta single-line (ville · horaire)
 *  - border-left 3px gj-yellow + pastille jaune discret au lieu de border full teal
 *  - badge "Mien" en pastille gj-yellow / gj-teal-deep
 *
 * Tap-min 44px préservé.
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
      className={`w-full flex items-start gap-3 rounded-gj-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`.trim()}
      style={{
        minHeight: 44,
        padding: '10px 12px',
        background: 'var(--gj-surface)',
        border: '1px solid var(--gj-line)',
        borderLeft: isMine ? '3px solid var(--gj-yellow)' : '1px solid var(--gj-line)',
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          background: 'var(--gj-teal-soft)',
          color: 'var(--gj-teal-deep)',
        }}
      >
        <Icon name="pin" size={16} />
      </span>

      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
        <div className="flex items-center gap-1.5">
          <h3
            className="m-0 truncate"
            style={{ color: 'var(--gj-ink)', fontSize: 14, fontWeight: 700 }}
          >
            {centre.nom}
          </h3>
          {isMine && (
            <span
              className="flex-shrink-0 font-black"
              style={{
                fontSize: 9.5,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                background: 'var(--gj-yellow)',
                color: 'var(--gj-teal-deep)',
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              Mien
            </span>
          )}
        </div>
        <div
          className="inline-flex items-center gap-1.5 flex-wrap"
          style={{ color: 'var(--gj-grey)', fontSize: 11.5 }}
        >
          <span>{centre.ville ?? centre.region}</span>
          <span aria-hidden="true">·</span>
          <CentreOpenDot open={isOpen} />
          <span>{isOpen ? 'Ouvert' : 'Fermé'} · {formatHoraireToday(centre.horaires)}</span>
        </div>
      </div>
    </article>
  )
}
