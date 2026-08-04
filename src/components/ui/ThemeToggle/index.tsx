'use client'

import type { AdminTheme } from '@/lib/admin-theme'
import { Icon } from '@/components/ui/Icon'

export interface ThemeToggleProps {
  /** Thème courant du contenu admin. */
  theme: AdminTheme
  /** Appelé au clic (le parent bascule l'état). */
  onToggle: () => void
  className?: string
}

/**
 * ThemeToggle — bouton de bascule clair/sombre du contenu admin (GUIC-680).
 *
 * Présentationnel (« bête ») : reçoit `theme` + `onToggle`, ne détient aucun état.
 * L'icône dépeint la cible : lune en clair (→ sombre), soleil en sombre (→ clair).
 * Aligné visuellement sur les boutons carrés de la topbar admin.
 */
export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
      className={className}
      style={{
        width: 42,
        height: 42,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 10,
        color: 'var(--gj-grey)',
        cursor: 'pointer',
        flexShrink: 0,
        fontFamily: 'inherit',
      }}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}
