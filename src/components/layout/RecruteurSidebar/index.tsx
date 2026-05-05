'use client'
import Link from 'next/link'
import { useState } from 'react'

const NAV = [
  { href: '/recruteur/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/recruteur/mes-offres',      label: 'Mes offres' },
  { href: '/recruteur/candidatures',    label: 'Candidatures reçues' },
]

export function RecruteurSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Bouton hamburger mobile */}
      <button
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

      {/* Overlay mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[250]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto
          w-64 min-h-screen bg-gj-bg border-r border-color-border-default flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-space-5 border-b border-color-border-default">
          <span className="font-bold text-color-action-primary text-fs-300">Espace Recruteur</span>
        </div>
        <nav className="flex-1 py-space-3">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-space-5 py-space-3 text-fs-300 text-color-text-primary
                hover:bg-gj-teal-soft hover:text-color-action-primary no-underline transition-colors
                min-h-[var(--tap-min)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
