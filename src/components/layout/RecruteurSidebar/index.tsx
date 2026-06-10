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

const SECTIONS: Section[] = [
  {
    items: [
      { id: 'home', href: '/recruteur/tableau-de-bord', icon: 'home', label: 'Tableau de bord' },
    ],
  },
  {
    title: 'Recrutement',
    items: [
      { id: 'offres', href: '/recruteur/mes-offres', icon: 'employment', label: 'Mes offres' },
      { id: 'candidatures', href: '/recruteur/candidatures', icon: 'document', label: 'Candidatures reçues' },
    ],
  },
]

/**
 * RecruteurSidebar — sidebar gauche backoffice recruteur.
 *
 * Pattern aligné sur `BenefSidebar` (design v2) avec palette claire :
 * - `bg-gj-surface` (blanc) + bordure droite
 * - Header "Espace Recruteur" en teal
 * - 3 items en 2 sections (Tableau de bord / Recrutement)
 * - Footer déconnexion
 * - Drawer mobile (hamburger + overlay + ESC pour fermer)
 */
export function RecruteurSidebar() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

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
        <span className="block w-5 h-0.5 bg-gj-ink" />
        <span className="block w-5 h-0.5 bg-gj-ink" />
        <span className="block w-5 h-0.5 bg-gj-ink" />
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
        aria-label="Navigation recruteur"
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto
          min-h-screen flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: 260,
          background: 'var(--gj-surface)',
          borderRight: '1px solid var(--gj-line)',
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
            borderBottom: '1px solid var(--gj-line)',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: 'var(--gj-teal-deep)',
              letterSpacing: '.3px',
            }}
          >
            Espace Recruteur
          </span>
          <span
            style={{
              fontSize: 9.5,
              color: 'var(--gj-grey)',
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Offres · Candidatures
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
                    color: 'var(--gj-grey)',
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
                      color: on ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
                      fontWeight: on ? 800 : 600,
                      minHeight: 38,
                      background: on ? 'var(--gj-teal-soft)' : 'transparent',
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
            borderTop: '1px solid var(--gj-line)',
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
              color: 'var(--gj-grey)',
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
