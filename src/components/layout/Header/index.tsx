import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

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
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <Avatar nom={session.nom} prenom={session.prenom} size="sm" />
              <Link href="/jeune/mon-profil" className="text-sm text-cjs-noir no-underline hidden sm:inline">
                {session.prenom}
              </Link>
              <Link
                href="/api/auth/logout"
                className="text-sm text-cjs-gris hover:text-cjs-rouge no-underline hidden sm:inline transition-colors"
              >
                Déconnexion
              </Link>
            </div>
          ) : (
            <Link href="/auth/connexion">
              <Button size="sm">Se connecter</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
