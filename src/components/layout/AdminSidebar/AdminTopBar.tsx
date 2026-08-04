'use client'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAdminTheme } from '@/components/layout/AdminSidebar/AdminThemeProvider'

/**
 * AdminTopBar — barre supérieure desktop pour le chrome admin (Lot 11).
 *
 * Fond blanc / `--gj-bg`, bordure `--gj-line`.
 * Contenu : titre « Administration », pill année courante, et cloche qui sert de
 * raccourci vers la file de modération (le badge = publications en attente, comme
 * le badge 23 de la maquette Lot 11). L'ancien bouton « Exporter » non câblé a été
 * retiré : l'export se fait par page (data-hub, candidatures…), pas globalement.
 *
 * Masquée sur mobile (la barre mobile sombre vit dans layout.tsx).
 */
export function AdminTopBar({ notificationCount }: { notificationCount?: number }) {
  const annee = new Date().getFullYear()
  const { theme, toggle } = useAdminTheme()
  return (
    <div
      className="hidden md:flex"
      style={{
        background: 'var(--gj-surface)',
        borderBottom: '1px solid var(--gj-line)',
        padding: '0 24px',
        alignItems: 'center',
        gap: 14,
        minHeight: 64,
        flexShrink: 0,
      }}
    >
      {/* Titre / sous-titre (slot statique — les pages surchargeront via <title>) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: 'var(--gj-ink)',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Administration
        </h1>
      </div>

      {/* Pill « Année 2026 » */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--gj-bg)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 10,
          padding: '0 13px',
          minHeight: 40,
          fontSize: 12.5,
          fontWeight: 700,
          color: 'var(--gj-ink)',
        }}
      >
        <Icon name="calendar" size={14} style={{ color: 'var(--gj-grey)' }} />
        Année {annee}
      </div>

      {/* Bascule thème clair/sombre du contenu admin (GUIC-680) */}
      <ThemeToggle theme={theme} onToggle={toggle} />

      {/* Cloche → raccourci vers la file de modération (badge = en attente) */}
      <Link
        href="/admin/opportunites"
        aria-label={
          notificationCount != null && notificationCount > 0
            ? `${notificationCount} publication(s) en attente de modération`
            : 'File de modération'
        }
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
          position: 'relative',
          flexShrink: 0,
          fontFamily: 'inherit',
          textDecoration: 'none',
        }}
      >
        <Icon name="bell" size={18} />
        {notificationCount != null && notificationCount > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: 'var(--gj-red)',
              color: 'var(--gj-surface)',
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--gj-surface)',
            }}
          >
            {notificationCount}
          </span>
        )}
      </Link>
    </div>
  )
}
