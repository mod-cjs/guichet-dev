import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-cjs-noir text-white mt-16">
      <div className="container-page py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-cjs-or font-semibold mb-3">Guichet Jeunesse</h3>
          <p className="text-gray-400 text-sm">
            Portail numérique du Consortium Jeunesse Sénégal.<br />
            Opportunités, formations et ressources pour les jeunes.
          </p>
        </div>
        <div>
          <h3 className="text-cjs-or font-semibold mb-3">Liens rapides</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/opportunites" className="hover:text-white no-underline">Opportunités</Link></li>
            <li><Link href="/evenements"   className="hover:text-white no-underline">Événements</Link></li>
            <li><Link href="/ressources"   className="hover:text-white no-underline">Ressources</Link></li>
            <li><Link href="/centres"      className="hover:text-white no-underline">Centres CJS</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-cjs-or font-semibold mb-3">Contact</h3>
          <p className="text-gray-400 text-sm">
            Consortium Jeunesse Sénégal<br />
            Dakar, Sénégal
          </p>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4">
        <p className="text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} Consortium Jeunesse Sénégal — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
