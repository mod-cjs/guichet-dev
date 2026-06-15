'use client'

import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'
import {
  ReservationStatusBadge,
  type ReservationStatutValue,
} from '../ReservationStatusBadge'

export type ReservationCardRessourceType =
  | 'Salle'
  | 'Vehicule'
  | 'Poste_info'
  | 'Equipement'
  | 'Atelier_recurrent'
  | string

export interface ReservationCardData {
  id: string
  ressource: {
    /** Optionnel : utilisé pour construire le lien "Réserver à nouveau". */
    id?: string
    nom: string
    type: ReservationCardRessourceType
  }
  centre: {
    slug: string
    nom: string
    region: string
  }
  /** ISO string, jour calendaire. */
  dateReservee: string
  /** HH:MM */
  creneauDebut: string
  /** HH:MM */
  creneauFin: string
  nombrePersonnes: number
  motif: string
  statut: ReservationStatutValue | string
  decisionA?: string | null
  fichierJustifUrl?: string | null
}

export interface ReservationCardProps {
  reservation: ReservationCardData
  /** Appelé quand l'utilisateur confirme l'annulation. */
  onCancel?: (reservationId: string) => void
  /** Appelé pour afficher le QR de retrait. */
  onShowQR?: (reservationId: string) => void
  /** Date "now" injectable pour tests. */
  now?: Date
  className?: string
}

const TYPE_ICON: Record<string, IconName> = {
  Salle: 'users',
  Vehicule: 'car',
  Poste_info: 'desktop',
  Equipement: 'bolt',
  Atelier_recurrent: 'calendar',
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function isDateUpcoming(dateISO: string, creneauFin: string, now: Date): boolean {
  // Combine date (jour calendaire) + heure fin créneau
  const d = new Date(dateISO)
  const [h, m] = creneauFin.split(':').map(Number)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d.getTime() > now.getTime()
}

/**
 * <ReservationCard> — carte d'une réservation centre dans
 * `/jeune/mes-reservations-centres` (W5).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5.
 *
 * Actions dépendant du statut + futur/passé :
 * - Acceptee + à venir : QR de retrait + Annuler
 * - EnAttente + à venir : Annuler (avec note "En attente de validation")
 * - Acceptee + passée + pas de check-in : badge "Non honorée"
 * - Passee : "Voir les ressources de ce centre"
 * - AnnuleeParJeune / Refusee / NonHonoree : aucune action
 *
 * Tap-min 44px partout, tokens `gj-*`, jamais d'emoji.
 */
export function ReservationCard({
  reservation,
  onCancel,
  onShowQR,
  now = new Date(),
  className = '',
}: ReservationCardProps) {
  const { id, ressource, centre, dateReservee, creneauDebut, creneauFin, nombrePersonnes, motif, statut, fichierJustifUrl } = reservation
  const iconName: IconName = TYPE_ICON[ressource.type] ?? 'document'
  const upcoming = isDateUpcoming(dateReservee, creneauFin, now)
  const dateLabel = DATE_FMT.format(new Date(dateReservee))

  const handleCancel = () => {
    if (!onCancel) return
    const ok = typeof window !== 'undefined'
      ? window.confirm(`Annuler la réservation "${ressource.nom}" ?`)
      : true
    if (ok) onCancel(id)
  }

  const showQRBtn = statut === 'Acceptee' && upcoming
  const showCancelBtn = (statut === 'Acceptee' || statut === 'EnAttente') && upcoming
  const showSeeRessourcesBtn = statut === 'Passee'
  // GUIC-392 — CTAs par statut (design-v2 / MyResaContent)
  const showProposeBtn = statut === 'Refusee'
  const showRebookBtn = statut === 'Passee' || statut === 'NonHonoree'
  const ressourceHref = ressource.id
    ? `/centres/${centre.slug}/ressources/${ressource.id}/reserver`
    : `/centres/${centre.slug}`

  return (
    <article
      data-testid="reservation-card"
      data-statut={statut}
      aria-label={`Réservation ${ressource.nom} — ${dateLabel}`}
      className={`flex flex-col gap-space-3 ${className}`.trim()}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-space-2">
        <ReservationStatusBadge statut={statut} />
        <span
          className="text-fs-200 font-semibold text-color-text-secondary inline-flex items-center gap-1"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <Icon name="calendar" size={14} />
          <span>{dateLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{creneauDebut}–{creneauFin}</span>
        </span>
      </div>

      {/* Body */}
      <div className="flex items-start gap-space-3">
        <div
          aria-hidden="true"
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--gj-teal-soft)',
            color: 'var(--gj-teal-deep)',
          }}
        >
          <Icon name={iconName} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-fs-400 font-bold text-color-text-primary leading-tight">
            {ressource.nom}
          </p>
          <Link
            href={`/centres/${centre.slug}`}
            className="text-fs-200 text-color-text-secondary hover:underline inline-flex items-center gap-1 mt-1"
            style={{ color: 'var(--gj-teal-deep)' }}
          >
            <Icon name="pin" size={12} />
            <span>{centre.nom}</span>
          </Link>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-space-3 text-fs-200 text-color-text-secondary">
        <span className="inline-flex items-center gap-1">
          <Icon name="users" size={14} />
          <span>
            {nombrePersonnes} {nombrePersonnes > 1 ? 'personnes' : 'personne'}
          </span>
        </span>
        <span
          className="flex-1 min-w-0"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={motif}
        >
          {motif}
        </span>
      </div>

      {fichierJustifUrl ? (
        <p className="text-fs-200">
          <a
            href={fichierJustifUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
            style={{ color: 'var(--gj-teal-deep)' }}
          >
            <Icon name="attach" size={14} />
            <span>Justificatif joint</span>
            <Icon name="external" size={12} />
          </a>
          {/* TODO(GUIC-384) — Si Blob privé, exposer via proxy authentifié. */}
        </p>
      ) : null}

      {/* En attente note */}
      {statut === 'EnAttente' && upcoming ? (
        <p
          className="text-fs-200 inline-flex items-center gap-1"
          style={{ color: 'var(--gj-ink)' }}
        >
          <Icon name="info" size={14} />
          <span>En attente de validation du centre.</span>
        </p>
      ) : null}

      {/* Actions */}
      {(showQRBtn || showCancelBtn || showSeeRessourcesBtn || showProposeBtn || showRebookBtn) && (
        <div className="flex flex-wrap gap-space-2 pt-1">
          {showQRBtn && (
            <button
              type="button"
              onClick={() => onShowQR?.(id)}
              className="inline-flex items-center gap-2 px-3 rounded-gj-pill font-bold text-fs-300 cursor-pointer"
              style={{
                background: 'var(--gj-teal-deep)',
                color: 'var(--gj-surface)',
                border: 'none',
                minHeight: 44,
              }}
            >
              <Icon name="bookmark" size={16} />
              <span>Voir mon QR de retrait</span>
            </button>
          )}
          {showCancelBtn && (
            <button
              type="button"
              onClick={handleCancel}
              aria-label={`Annuler la réservation ${ressource.nom}`}
              className="inline-flex items-center gap-2 px-3 rounded-gj-pill font-bold text-fs-300 cursor-pointer"
              style={{
                background: 'var(--gj-surface)',
                color: 'var(--gj-red)',
                border: '1.5px solid var(--gj-red)',
                minHeight: 44,
              }}
            >
              <Icon name="close" size={16} />
              <span>Annuler</span>
            </button>
          )}
          {showSeeRessourcesBtn && (
            <Link
              href={`/centres/${centre.slug}/ressources`}
              className="inline-flex items-center gap-2 px-3 rounded-gj-pill font-bold text-fs-300 no-underline"
              style={{
                background: 'var(--gj-surface)',
                color: 'var(--gj-teal-deep)',
                border: '1.5px solid var(--gj-teal-deep)',
                minHeight: 44,
              }}
            >
              <Icon name="arrow-right" size={16} />
              <span>Voir les ressources de ce centre</span>
            </Link>
          )}
          {showProposeBtn && (
            <Link
              href={`${ressourceHref}?from=refusee`}
              className="inline-flex items-center gap-2 px-3 rounded-gj-pill font-bold text-fs-300 no-underline"
              style={{
                background: 'var(--gj-teal-deep)',
                color: 'var(--gj-surface)',
                border: 'none',
                minHeight: 44,
              }}
            >
              <Icon name="calendar" size={16} />
              <span>Proposer un autre créneau</span>
            </Link>
          )}
          {showRebookBtn && (
            <Link
              href={`${ressourceHref}?from=passee`}
              className="inline-flex items-center gap-2 px-3 rounded-gj-pill font-bold text-fs-300 no-underline"
              style={{
                background: 'var(--gj-teal-deep)',
                color: 'var(--gj-surface)',
                border: 'none',
                minHeight: 44,
              }}
            >
              <Icon name="arrow-right" size={16} />
              <span>Réserver à nouveau</span>
            </Link>
          )}
        </div>
      )}
    </article>
  )
}
