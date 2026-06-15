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
  /** Adresse postale complète. Affichée sur une ligne dédiée sous le nom si présente. */
  addr?: string
  horaires?: CentreCardMobileHoraire[]
  /** Distance utilisateur en km. Non affichée si `undefined`. */
  km?: number
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

function formatKm(km?: number): string | null {
  if (km === undefined || km === null) return null
  if (Number.isNaN(km)) return null
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`
}

/**
 * <CentreCardMobile> — variante mobile compacte de l'annuaire centres.
 *
 * Refonte fidèle au design source `public/design-v2/centres-mobile.jsx` (l.45-62) :
 *  - Pin 42×42 (teal-soft si `mine`, gj-bg sinon)
 *  - Header : nom · badge "Mien" (teal-soft) · spacer · km (teal-deep)
 *  - Adresse complète sur ligne dédiée (si fournie)
 *  - Meta : OpenDot · horaires
 *  - Bordure 1.5px teal si `mine` sinon 1px line (pas de border-left jaune)
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
  const kmLabel = formatKm(centre.km)
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
        padding: 13,
        background: 'var(--gj-surface)',
        border: isMine ? '1.5px solid var(--gj-teal)' : '1px solid var(--gj-line)',
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: isMine ? 'var(--gj-teal-soft)' : 'var(--gj-bg)',
          color: isMine ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
        }}
      >
        <Icon name="pin" size={20} />
      </span>

      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
        <div className="flex items-center gap-1.5">
          <h3
            className="m-0 truncate"
            style={{ color: 'var(--gj-ink)', fontSize: 14, fontWeight: 800 }}
          >
            {centre.nom}
          </h3>
          {isMine && (
            <span
              className="flex-shrink-0 font-black"
              style={{
                fontSize: 9,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                background: 'var(--gj-teal-soft)',
                color: 'var(--gj-teal-deep)',
                padding: '1px 7px',
                borderRadius: 999,
              }}
            >
              Mien
            </span>
          )}
          <span style={{ flex: 1 }} />
          {kmLabel && (
            <span
              className="flex-shrink-0 font-black"
              style={{
                fontSize: 11,
                color: 'var(--gj-teal-deep)',
                whiteSpace: 'nowrap',
              }}
            >
              {kmLabel}
            </span>
          )}
        </div>

        {centre.addr && (
          <div style={{ color: 'var(--gj-grey)', fontSize: 11.5, marginTop: 2 }}>
            {centre.addr}
          </div>
        )}

        <div
          className="inline-flex items-center flex-wrap"
          style={{ gap: 12, marginTop: 6, color: 'var(--gj-grey)', fontSize: 11 }}
        >
          <span
            className="inline-flex items-center"
            style={{
              gap: 5,
              fontWeight: 700,
              color: isOpen ? 'var(--gj-green-ink)' : 'var(--gj-grey)',
            }}
          >
            <CentreOpenDot open={isOpen} />
            {isOpen ? 'Ouvert' : 'Fermé'} · {formatHoraireToday(centre.horaires)}
          </span>
        </div>
      </div>
    </article>
  )
}
