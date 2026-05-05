'use client'
import Link from 'next/link'
import { useState } from 'react'

const NAV = [
  { href: '/admin/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/admin/utilisateurs',    label: 'Utilisateurs' },
  { href: '/admin/opportunites',    label: 'Opportunités' },
  { href: '/admin/evenements',      label: 'Événements' },
  { href: '/admin/ressources',      label: 'Ressources' },
  { href: '/admin/centres',         label: 'Centres' },
  { href: '/admin/data-hub',        label: 'Data Hub' },
]

export function AdminSidebar() {
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
        <span className="block w-5 h-0.5 bg-white" />
        <span className="block w-5 h-0.5 bg-white" />
        <span className="block w-5 h-0.5 bg-white" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[250]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto
          w-64 min-h-screen bg-gj-ink text-white flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-space-5 border-b border-white/10">
          <span className="font-bold text-gj-yellow text-fs-300">Administration CJS</span>
        </div>
        <nav className="flex-1 py-space-3">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-space-5 py-space-3 text-fs-300 text-white/80
                hover:bg-white/10 hover:text-white no-underline transition-colors
                min-h-[var(--tap-min)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-space-5 border-t border-white/10">
          <Link href="/api/auth/logout" className="text-fs-200 text-white/50 hover:text-white no-underline">
            Se déconnecter
          </Link>
        </div>
      </aside>
    </>
  )
}
