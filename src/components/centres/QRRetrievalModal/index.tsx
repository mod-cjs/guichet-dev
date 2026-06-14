'use client'

import { Modal } from '@/components/ui/Modal'
import { Icon } from '@/components/ui/Icon'

export interface QRRetrievalModalProps {
  isOpen: boolean
  onClose: () => void
  reservation: {
    id: string
    ressourceNom: string
    centreNom: string
    dateReservee: string | Date
    creneauDebut: string
    creneauFin: string
  }
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * <QRRetrievalModal> — modal de retrait de ressource (W5).
 *
 * Hero icône qr + titre "Présente ce code au centre". Le QR réel est
 * délégué à Wave 6 (token JWT signé) — on rend ici un placeholder à
 * partir de l'id de la réservation (illustratif).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5.
 *
 * TODO(Wave 6) — remplacer le placeholder par `<QRBadge url={...} expiresAt={...} />`
 * dès que le endpoint `/api/reservations/:id/qr-token` sera disponible.
 */
export function QRRetrievalModal({
  isOpen,
  onClose,
  reservation,
}: QRRetrievalModalProps) {
  const date =
    reservation.dateReservee instanceof Date
      ? reservation.dateReservee
      : new Date(reservation.dateReservee)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="QR de retrait">
      <div className="flex flex-col items-center text-center gap-space-3">
        <div
          aria-hidden="true"
          className="inline-flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--gj-teal-soft)',
            color: 'var(--gj-teal-deep)',
          }}
        >
          <Icon name="bookmark" size={28} title="QR de retrait" />
        </div>

        <h2 className="text-fs-500 font-bold text-color-text-primary">
          Présente ce code au centre
        </h2>

        {/* TODO(Wave 6) : QR réel signé. Placeholder pédagogique pour l'instant. */}
        <div
          data-testid="qr-retrieval-placeholder"
          aria-label="QR code de retrait — placeholder"
          role="img"
          className="rounded-gj-md"
          style={{
            width: 220,
            height: 220,
            background:
              'repeating-conic-gradient(var(--gj-ink) 0 25%, var(--gj-surface) 0 50%) 50% / 16px 16px',
            border: '1.5px solid var(--gj-line)',
          }}
        />

        <div
          className="w-full text-left p-space-3 rounded-gj-md"
          style={{
            background: 'var(--gj-bg)',
            border: '1px solid var(--gj-line)',
          }}
        >
          <p className="text-fs-300 font-bold text-color-text-primary mb-1">
            {reservation.ressourceNom}
          </p>
          <p className="text-fs-200 text-color-text-secondary">
            {reservation.centreNom}
          </p>
          <p className="text-fs-200 text-color-text-secondary mt-1">
            {DATE_FMT.format(date)} · {reservation.creneauDebut}–{reservation.creneauFin}
          </p>
        </div>

        <p className="text-fs-200 text-color-text-secondary">
          Code valable 24h. Présente-le à l&apos;accueil du centre.
        </p>
      </div>
    </Modal>
  )
}
