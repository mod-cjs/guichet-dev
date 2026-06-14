'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

interface Item {
  id: string
  href: string
  icon: IconName
  label: string
}

interface Section {
  title?: string
  items: Item[]
}

/**
 * Sections de navigation Admin.
 * Aligné sur le pattern visuel de BenefSidebar (design v2) avec palette sombre.
 */
const SECTIONS: Section[] = [
  {
    items: [
      { id: 'home', href: '/admin/tableau-de-bord', icon: 'home', label: 'Tableau de bord' },
    ],
  },
  {
    title: 'Modération',
    items: [
      { id: 'utilisateurs', href: '/admin/utilisateurs', icon: 'profile', label: 'Utilisateurs' },
      { id: 'opportunites', href: '/admin/opportunites', icon: 'employment', label: 'Opportunités' },
      { id: 'evenements', href: '/admin/evenements', icon: 'calendar', label: 'Événements' },
      { id: 'ressources', href: '/admin/ressources', icon: 'document', label: 'Ressources' },
      { id: 'centres', href: '/admin/centres', icon: 'pin', label: 'Centres' },
    ],
  },
  {
    title: 'Système',
    items: [
      { id: 'analytics-centres', href: '/admin/analytics/centres', icon: 'chart', label: 'Analytics Centres' },
      { id: 'data-hub', href: '/admin/data-hub', icon: 'chart', label: 'Data Hub' },
    ],
  },
]

/**
 * AdminSidebar — sidebar gauche backoffice administrateur.
 *
 * Pattern aligné sur `BenefSidebar` (design v2) avec adaptations :
 * - Palette sombre (`bg-gj-ink`) — autorité administrative
 * - Header "Administration CJS" en jaune
 * - 7 items en 3 sections (Tableau de bord / Modération / Système)
 * - Footer déconnexion
 * - Drawer mobile (hamburger + overlay + ESC pour fermer)
 *
 * Largeur 260px desktop · cachée (drawer) sous `md` (768px).
 */
export function AdminSidebar() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  // ESC ferme le drawer.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Bouton hamburger mobile */}
      <button
        type="button"
        className="md:hidden fixed left-space-3 z-[200] flex flex-col justify-center
          gap-[4px] w-8 h-8 bg-transparent border-none"
        style={{ top: 'calc(8px + var(--safe-top))' }}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        <span className="block w-5 h-0.5 bg-white" />
        <span className="block w-5 h-0.5 bg-white" />
        <span className="block w-5 h-0.5 bg-white" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[250]"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        role="navigation"
        aria-label="Navigation administration"
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto
          min-h-screen flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: 260,
          background: 'var(--gj-ink)',
          color: 'var(--gj-surface)',
          padding: '16px 12px',
          gap: 4,
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '4px 6px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: 'var(--gj-yellow)',
              letterSpacing: '.3px',
            }}
          >
            Administration CJS
          </span>
          <span
            style={{
              fontSize: 9.5,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Modération · Système
          </span>
        </div>

        {/* Sections */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SECTIONS.map((section, sIdx) => (
            <div key={section.title ?? `section-${sIdx}`}>
              {section.title ? (
                <div
                  style={{
                    fontSize: 9.5,
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 800,
                    letterSpacing: '.4px',
                    textTransform: 'uppercase',
                    padding: '12px 10px 4px',
                  }}
                >
                  {section.title}
                </div>
              ) : null}
              {section.items.map(item => {
                const on = isActive(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={close}
                    aria-current={on ? 'page' : undefined}
                    className="no-underline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: on ? 'var(--gj-yellow)' : 'rgba(255,255,255,0.85)',
                      fontWeight: on ? 800 : 600,
                      minHeight: 38,
                      background: on ? 'rgba(255,255,255,0.08)' : 'transparent',
                      width: '100%',
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer déconnexion */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Link
            href="/api/auth/logout"
            className="no-underline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
            }}
          >
            <Icon name="external" size={16} />
            <span>Se déconnecter</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
