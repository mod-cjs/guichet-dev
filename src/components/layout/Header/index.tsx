import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { Avatar } from '@/components/ui/Avatar'

export async function Header() {
  const session = await getSession()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="container-page h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold text-cjs-vert">Guichet Jeunesse</span>
          <span className="hidden sm:inline text-xs text-cjs-gris font-normal">— CJS</span>
        </Link>

        {/* Navigation publique */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/opportunites" className="text-cjs-noir hover:text-cjs-vert no-underline text-sm font-medium">Opportunités</Link>
          <Link href="/evenements"   className="text-cjs-noir hover:text-cjs-vert no-underline text-sm font-medium">Événements</Link>
          <Link href="/ressources"   className="text-cjs-noir hover:text-cjs-vert no-underline text-sm font-medium">Ressources</Link>
          <Link href="/centres"      className="text-cjs-noir hover:text-cjs-vert no-underline text-sm font-medium">Centres</Link>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Link
                href="/jeune/mon-profil"
                className="flex items-center gap-2 no-underline"
              >
                <Avatar nom={session.nom} prenom={session.prenom} size="sm" />
                <span className="hidden sm:inline text-sm text-cjs-noir">
                  {session.prenom}
                </span>
              </Link>
              <a
                href="/auth/deconnexion"
                className="text-xs px-2 py-1 rounded border border-cjs-gris/30
                  text-cjs-gris hover:text-cjs-rouge hover:border-cjs-rouge
                  no-underline transition-colors whitespace-nowrap"
              >
                Déconnexion
              </a>
            </>
          ) : (
            <a
              href="/api/auth/login"
              className="inline-flex items-center justify-center
                bg-cjs-vert hover:bg-cjs-vert-clair text-white text-sm font-medium
                rounded-cjs no-underline transition-colors whitespace-nowrap px-3 py-1.5"
            >
              Se connecter
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
