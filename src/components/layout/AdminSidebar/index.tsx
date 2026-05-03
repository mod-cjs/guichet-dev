import Link from 'next/link'

const NAV = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/utilisateurs',    label: 'Utilisateurs' },
  { href: '/opportunites',    label: 'Opportunités' },
  { href: '/evenements',      label: 'Événements' },
  { href: '/ressources',      label: 'Ressources' },
  { href: '/centres',         label: 'Centres' },
  { href: '/data-hub',        label: 'Data Hub' },
]

export function AdminSidebar() {
  return (
    <aside className="w-64 min-h-screen bg-cjs-noir text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <span className="font-bold text-cjs-or">Administration CJS</span>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-6 py-3 text-sm text-gray-300
              hover:bg-gray-800 hover:text-white no-underline transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-6 border-t border-gray-800">
        <Link href="/api/auth/logout" className="text-sm text-gray-400 hover:text-white no-underline">
          Se déconnecter
        </Link>
      </div>
    </aside>
  )
}
