'use client'

import { Icon } from '@/components/ui/Icon'

export interface ReservationRecapProps {
  ressource: { nom: string; type: string }
  centre: { nom: string }
  date: Date | null
  slot: string | null
  people: number
  /** Si fourni, rend le CTA submit ici (desktop aside). */
  submitButton?: React.ReactNode
  className?: string
}

const TYPE_LABEL: Record<string, string> = {
  Salle: 'Salle',
  Vehicule: 'Véhicule',
  Poste_info: 'Poste info',
  Equipement: 'Équipement',
  Atelier_recurrent: 'Atelier récurrent',
}

function formatDate(d: Date | null): string {
  if (!d) return '—'
  try {
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function formatSlot(slot: string | null): string {
  if (!slot) return '—'
  const [a, b] = slot.split('-')
  if (!a || !b) return slot
  return `${a.replace(':', 'h')} – ${b.replace(':', 'h')}`
}

/**
 * <ReservationRecap> — aside sticky desktop pour `/centres/[slug]/ressources/[id]/reserver`.
 *
 * Liste key-value + badge gratuit + banner délai 24-48h.
 * Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function ReservationRecap({
  ressource,
  centre,
  date,
  slot,
  people,
  submitButton,
  className = '',
}: ReservationRecapProps) {
  const rows: Array<[string, string]> = [
    ['Ressource', ressource.nom],
    ['Type', TYPE_LABEL[ressource.type] ?? ressource.type],
    ['Centre', centre.nom],
    ['Date', formatDate(date)],
    ['Créneau', formatSlot(slot)],
    ['Personnes', String(people)],
  ]

  return (
    <aside
      data-testid="reservation-recap"
      className={className}
      aria-label="Récapitulatif de la réservation"
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 8 }}>
        Récapitulatif
      </h3>
      {rows.map(([l, v]) => (
        <div
          key={l}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--gj-line)',
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--gj-grey)',
              fontWeight: 600,
            }}
          >
            {l}
          </span>
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--gj-ink)',
              fontWeight: 800,
              textAlign: 'right',
            }}
          >
            {v}
          </span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 0 6px',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--gj-grey)', fontWeight: 700 }}>
          Coût
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: 'var(--gj-green-ink)',
          }}
        >
          Gratuit
        </span>
      </div>
      {submitButton}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          marginTop: 12,
          fontSize: 11.5,
          color: 'var(--gj-yellow-ink)',
          background: 'var(--gj-yellow-soft)',
          padding: '10px 12px',
          borderRadius: 9,
          fontWeight: 600,
          lineHeight: 1.45,
        }}
      >
        <Icon name="clock" size={15} aria-hidden="true" />
        <span>
          Validation par le centre sous <b>24–48 h</b>. Retrait avec ton QR carte
          CJS.
        </span>
      </div>
    </aside>
  )
}
