'use client'

import { Icon } from '@/components/ui/Icon'

export interface CentreContactCardProps {
  telephone: string
  email?: string | null
  onPhoneClick?: () => void
  onEmailClick?: () => void
  className?: string
}

/**
 * Format lisible E.164 → "+221 33 981 20 20" (best-effort).
 */
function formatPhone(raw: string): string {
  const trimmed = raw.replace(/\s+/g, '')
  // +221 XX XXX XX XX (Sénégal)
  const senegal = /^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(trimmed)
  if (senegal) {
    return `+221 ${senegal[1]} ${senegal[2]} ${senegal[3]} ${senegal[4]}`
  }
  return trimmed
}

/**
 * <CentreContactCard> — carte "Contact" : tel + email cliquables.
 *
 * - Tap-to-call (`tel:`), tap-to-mail (`mailto:`)
 * - Tap-min 44px sur chaque ligne (a11y mobile)
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export function CentreContactCard({
  telephone,
  email,
  onPhoneClick,
  onEmailClick,
  className = '',
}: CentreContactCardProps) {
  return (
    <section
      aria-label="Coordonnées du centre"
      className={className}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h3
        className="m-0"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--gj-teal-deep)',
        }}
      >
        Contact
      </h3>
      <a
        href={`tel:${telephone}`}
        onClick={onPhoneClick}
        aria-label={`Appeler le ${formatPhone(telephone)}`}
        className="inline-flex items-center"
        style={{
          gap: 10,
          color: 'var(--gj-ink)',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          minHeight: 44,
        }}
      >
        <Icon name="phone" size={16} style={{ color: 'var(--gj-teal-deep)' }} />
        {formatPhone(telephone)}
      </a>
      {email && (
        <a
          href={`mailto:${email}`}
          onClick={onEmailClick}
          aria-label={`Envoyer un email à ${email}`}
          className="inline-flex items-center"
          style={{
            gap: 10,
            color: 'var(--gj-ink)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            minHeight: 44,
            wordBreak: 'break-all',
          }}
        >
          <Icon name="mail" size={16} style={{ color: 'var(--gj-teal-deep)' }} />
          {email}
        </a>
      )}
    </section>
  )
}
