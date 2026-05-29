'use client'
import { Icon } from '@/components/ui/Icon'

export interface BenefTopBarProps {
  /** Valeur (controlled) du champ recherche. */
  searchQuery?: string
  /** Callback recherche (controlled). */
  onSearchChange?: (value: string) => void
  /** Placeholder du champ recherche. */
  searchPlaceholder?: string
  /** Nombre de notifications non lues. */
  unread?: number
  /** Nombre de favoris sauvegardés. */
  bookmarkCount?: number
  /** Initiales utilisateur (affichées en bout de barre). */
  userInitials?: string
  /** Callbacks pour chaque action. */
  onBookmarkClick?: () => void
  onBellClick?: () => void
  onInfoClick?: () => void
  onUserClick?: () => void
}

/**
 * BenefTopBar — top bar web bénéficiaire (≥1024px).
 *
 * Conforme `design-guichet-v2/web-dashboard.jsx` BenefTopBar :
 * - Search bar large (max 520px) + icon search + raccourci ⌘K
 * - Boutons droite : favoris (bookmark + count), cloche (unread badge),
 *   aide (info), avatar utilisateur
 * - Sticky top, h-16, bg-white, border-bottom
 *
 * Visible ≥1024px — l'AppTopbar mobile prend le relais en-dessous.
 */
export function BenefTopBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Rechercher une opportunité, un centre, un atelier…',
  unread = 0,
  bookmarkCount = 0,
  userInitials,
  onBookmarkClick,
  onBellClick,
  onInfoClick,
  onUserClick,
}: BenefTopBarProps) {
  return (
    <header
      role="banner"
      className="hidden lg:flex sticky top-0"
      style={{
        background: 'var(--gj-surface)',
        borderBottom: '1px solid var(--gj-line)',
        padding: '10px 24px',
        alignItems: 'center',
        gap: 14,
        minHeight: 64,
        flexShrink: 0,
        zIndex: 5,
      }}
    >
      {/* Search */}
      <div
        style={{
          flex: 1,
          maxWidth: 520,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--gj-bg)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 10,
          padding: '0 14px',
          minHeight: 42,
        }}
      >
        <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
        <input
          type="search"
          value={searchQuery ?? ''}
          onChange={e => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Rechercher"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: 'transparent',
            fontSize: 14,
            fontFamily: 'inherit',
            color: 'var(--gj-ink)',
          }}
        />
        <kbd
          aria-hidden
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            background: 'var(--gj-surface)',
            border: '1px solid var(--gj-line)',
            borderRadius: 4,
            padding: '1px 5px',
            color: 'var(--gj-grey-2)',
          }}
        >
          ⌘ K
        </kbd>
      </div>

      <span style={{ flex: 1 }} />

      {/* Bookmark */}
      <button
        type="button"
        onClick={onBookmarkClick}
        aria-label={
          bookmarkCount > 0
            ? `Mes favoris (${bookmarkCount} sauvegardés)`
            : 'Mes favoris'
        }
        style={iconBtn}
      >
        <Icon name="bookmark" size={18} />
        {bookmarkCount > 0 ? (
          <span style={countBadge('var(--gj-grey)')}>{bookmarkCount}</span>
        ) : null}
      </button>

      {/* Bell */}
      <button
        type="button"
        onClick={onBellClick}
        aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
        style={iconBtn}
      >
        <Icon name="bell" size={18} />
        {unread > 0 ? (
          <span style={countBadge('var(--gj-red)')}>{unread > 99 ? '99+' : unread}</span>
        ) : null}
      </button>

      {/* Info / Help */}
      <button type="button" onClick={onInfoClick} aria-label="Aide" style={iconBtn}>
        <Icon name="info" size={18} />
      </button>

      {/* User */}
      {userInitials ? (
        <button
          type="button"
          onClick={onUserClick}
          aria-label="Profil"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
            color: 'var(--gj-surface)',
            fontWeight: 800,
            fontSize: 13,
            border: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {userInitials}
        </button>
      ) : null}
    </header>
  )
}

const iconBtn = {
  width: 42,
  height: 42,
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  background: 'var(--gj-surface)',
  border: '1.5px solid var(--gj-line)',
  borderRadius: 10,
  color: 'var(--gj-grey)',
  cursor: 'pointer',
  position: 'relative' as const,
  flexShrink: 0,
}

function countBadge(bg: string) {
  return {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    background: bg,
    color: 'var(--gj-surface)',
    fontSize: 10,
    fontWeight: 800,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    border: '2px solid var(--gj-surface)',
  }
}
