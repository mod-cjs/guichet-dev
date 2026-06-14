/**
 * <ReservationStatusBadge> — pastille statut réservation centre (W5).
 *
 * Mapping cf. `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5 :
 * - Acceptee     → vert  "Confirmée"
 * - EnAttente    → jaune "En attente"
 * - Passee       → gris  "Passée"
 * - AnnuleeParJeune → gris foncé "Annulée"
 * - Refusee      → rouge "Refusée"
 * - NonHonoree   → rouge "Non honorée"
 *
 * Couleurs via tokens `gj-*`. Aucun hex en dur.
 */
export type ReservationStatutValue =
  | 'Acceptee'
  | 'EnAttente'
  | 'Passee'
  | 'AnnuleeParJeune'
  | 'Refusee'
  | 'NonHonoree'

export interface ReservationStatusBadgeProps {
  statut: ReservationStatutValue | string
  className?: string
}

interface Tone {
  label: string
  bg: string
  color: string
}

const TONES: Record<string, Tone> = {
  Acceptee: { label: 'Confirmée', bg: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' },
  EnAttente: { label: 'En attente', bg: 'var(--gj-yellow-soft, #FFF4D6)', color: 'var(--gj-ink)' },
  Passee: { label: 'Passée', bg: 'var(--gj-line)', color: 'var(--gj-grey)' },
  AnnuleeParJeune: { label: 'Annulée', bg: 'var(--gj-line)', color: 'var(--gj-ink)' },
  Refusee: { label: 'Refusée', bg: 'var(--gj-red-soft, #FBE3E1)', color: 'var(--gj-red)' },
  NonHonoree: { label: 'Non honorée', bg: 'var(--gj-red-soft, #FBE3E1)', color: 'var(--gj-red)' },
}

export function ReservationStatusBadge({
  statut,
  className = '',
}: ReservationStatusBadgeProps) {
  const tone = TONES[statut] ?? { label: statut, bg: 'var(--gj-line)', color: 'var(--gj-ink)' }
  return (
    <span
      data-testid="reservation-status-badge"
      data-statut={statut}
      role="status"
      aria-label={`Statut : ${tone.label}`}
      className={`inline-flex items-center px-2 py-1 rounded-gj-pill text-fs-100 font-bold ${className}`.trim()}
      style={{ background: tone.bg, color: tone.color }}
    >
      {tone.label}
    </span>
  )
}
