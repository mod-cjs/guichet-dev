'use client'

import { Icon, type IconName } from '@/components/ui/Icon'

export type ReservationRecapMiniType =
  | 'Salle'
  | 'Vehicule'
  | 'Poste_info'
  | 'Equipement'
  | 'Atelier_recurrent'
  | string

export interface ReservationRecapMiniProps {
  ressource: {
    nom: string
    type: ReservationRecapMiniType
    /** Capacité formatée (ex. "12 personnes" ou "5 places"). */
    capaciteLabel?: string
  }
  centre: { nom: string }
  /** Affiche le badge "Gratuit" en bout de carte (défaut : true). */
  gratuit?: boolean
  className?: string
}

const TYPE_ICON: Record<string, IconName> = {
  Salle: 'users',
  Vehicule: 'car',
  Poste_info: 'desktop',
  Equipement: 'bolt',
  Atelier_recurrent: 'calendar',
}

/**
 * Palette pastel par type (cohérente avec RES_KIND du design-v2).
 * `bg` = fond pastel · `fg` = icône / texte sur pastel.
 */
const TYPE_PALETTE: Record<string, { bg: string; fg: string }> = {
  Salle: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
  Vehicule: { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  Poste_info: { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' },
  Equipement: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
  Atelier_recurrent: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
}

/**
 * <ReservationRecapMini> — mini-carte récap ressource en tête du formulaire
 * de réservation. Variante horizontale compacte du `<ReservationRecap>` aside.
 *
 * Design source : `public/design-v2/centres-web.jsx:258-266` (resource recap).
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 7 — GUIC-399.
 *
 * Layout : [icône 52×52 fond pastel] · [nom bold + meta centre/capacité] · [chip Gratuit].
 */
export function ReservationRecapMini({
  ressource,
  centre,
  gratuit = true,
  className = '',
}: ReservationRecapMiniProps) {
  const iconName: IconName = TYPE_ICON[ressource.type] ?? 'document'
  const palette =
    TYPE_PALETTE[ressource.type] ?? {
      bg: 'var(--gj-teal-soft)',
      fg: 'var(--gj-teal-deep)',
    }
  const metaParts = [centre.nom, ressource.capaciteLabel].filter(Boolean)

  return (
    <div
      data-testid="reservation-recap-mini"
      className={className}
      aria-label={`Récapitulatif ressource ${ressource.nom}`}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          flexShrink: 0,
          background: palette.bg,
          color: palette.fg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={iconName} size={26} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: 'var(--gj-ink)',
          }}
        >
          {ressource.nom}
        </div>
        {metaParts.length > 0 ? (
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--gj-grey)',
              marginTop: 2,
            }}
          >
            {metaParts.join(' · ')}
          </div>
        ) : null}
      </div>
      {gratuit ? (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: 'var(--gj-green-ink)',
            background: 'var(--gj-green-soft)',
            padding: '3px 10px',
            borderRadius: 999,
            flexShrink: 0,
          }}
        >
          Gratuit
        </span>
      ) : null}
    </div>
  )
}
