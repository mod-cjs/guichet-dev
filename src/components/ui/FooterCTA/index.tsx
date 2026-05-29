'use client'
import { Icon } from '@/components/ui/Icon'

export interface FooterCTAButton {
  label: string
  onClick?: () => void
  type?: 'button' | 'submit'
  href?: string
}

export interface FooterCTAProps {
  /** CTA principal (solide, teal-deep). */
  primary: FooterCTAButton
  /** CTA secondaire optionnel (outlined ghost). */
  secondary?: FooterCTAButton
  /** Désactive les boutons. */
  disabled?: boolean
  /** Indique un chargement en cours (désactive + spinner sur le primary). */
  loading?: boolean
  /** Affiche la flèche → sur le primary (défaut true). */
  showArrow?: boolean
  /** Sticky bottom avec safe-area (défaut true). */
  sticky?: boolean
  className?: string
}

/**
 * FooterCTA — barre de boutons sticky bottom (form flows / onboarding).
 *
 * Conforme `design-guichet-v2/phone.jsx` FooterCTA :
 * - 1 ou 2 boutons, min-height 48px
 * - secondary : outlined teal-deep / fond blanc
 * - primary : solide teal-deep / blanc, flèche `arrow-right` du sprite
 * - sticky bottom, bg-white, border-top, padding 14px
 * - safe-area-inset-bottom respectée
 */
export function FooterCTA({
  primary,
  secondary,
  disabled = false,
  loading = false,
  showArrow = true,
  sticky = true,
  className = '',
}: FooterCTAProps) {
  const isDisabled = disabled || loading

  return (
    <div
      className={className}
      style={{
        padding: 14,
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--gj-surface)',
        borderTop: '1px solid var(--gj-line)',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
        position: sticky ? 'sticky' : undefined,
        bottom: sticky ? 0 : undefined,
        zIndex: sticky ? 10 : undefined,
      }}
    >
      {secondary ? (
        <button
          type={secondary.type ?? 'button'}
          onClick={secondary.onClick}
          disabled={isDisabled}
          style={{
            flex: '0 0 auto',
            background: 'var(--gj-surface)',
            color: 'var(--gj-teal-deep)',
            border: '1.5px solid var(--gj-line)',
            padding: '0 18px',
            minHeight: 48,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            opacity: isDisabled ? 0.6 : 1,
          }}
        >
          {secondary.label}
        </button>
      ) : null}
      <button
        type={primary.type ?? 'button'}
        onClick={primary.onClick}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        style={{
          flex: 1,
          background: 'var(--gj-teal-deep)',
          color: 'var(--gj-surface)',
          border: 0,
          padding: '0 18px',
          minHeight: 48,
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 15,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: isDisabled ? 0.7 : 1,
        }}
      >
        {loading ? (
          <span
            aria-hidden
            style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(255,255,255,.4)',
              borderTopColor: 'var(--gj-surface)',
              borderRadius: '50%',
              animation: 'gj-spin .8s linear infinite',
              display: 'inline-block',
            }}
          />
        ) : null}
        <span>{primary.label}</span>
        {showArrow && !loading ? <Icon name="arrow-right" size={16} /> : null}
      </button>
    </div>
  )
}
