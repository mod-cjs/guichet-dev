import Link from 'next/link'

const NAV = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/mes-offres',      label: 'Mes offres' },
  { href: '/candidatures',    label: 'Candidatures reçues' },
]

export function RecruteurSidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <span className="font-semibold text-cjs-vert text-sm">Espace Recruteur</span>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-5 py-3 text-sm text-cjs-noir
              hover:bg-white hover:text-cjs-vert no-underline transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
