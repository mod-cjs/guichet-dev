import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-gj-ink text-white mt-16">
      <div className="container-page py-space-7 grid grid-cols-1 md:grid-cols-3 gap-space-6">
        <div>
          <h3 className="text-gj-yellow font-bold text-fs-300 mb-space-3">Guichet Jeunesse</h3>
          <p className="text-white/60 text-fs-200">
            Portail numérique du Consortium Jeunesse Sénégal.<br />
            Opportunités, formations et ressources pour les jeunes.
          </p>
        </div>
        <div>
          <h3 className="text-gj-yellow font-bold text-fs-300 mb-space-3">Liens rapides</h3>
          <ul className="flex flex-col gap-space-2 text-fs-200 text-white/60">
            <li><Link href="/opportunites" className="hover:text-white no-underline transition-colors">Opportunités</Link></li>
            <li><Link href="/evenements"   className="hover:text-white no-underline transition-colors">Événements</Link></li>
            <li><Link href="/ressources"   className="hover:text-white no-underline transition-colors">Ressources</Link></li>
            <li><Link href="/centres"      className="hover:text-white no-underline transition-colors">Centres CJS</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-gj-yellow font-bold text-fs-300 mb-space-3">Contact</h3>
          <p className="text-white/60 text-fs-200">
            Consortium Jeunesse Sénégal<br />
            Dakar, Sénégal
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-space-3">
        <p className="text-center text-white/30 text-fs-100">
          © {new Date().getFullYear()} Consortium Jeunesse Sénégal — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
