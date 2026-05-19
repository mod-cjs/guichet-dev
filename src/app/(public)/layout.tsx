import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

/**
 * Layout des pages publiques. Le Header marketing et le Footer sont rendus :
 * - Toujours pour les visiteurs anonymes (toutes tailles)
 * - Sur desktop uniquement (md:block) pour les users connectés —
 *   sur mobile, MobileTopShell (AppTopbar) et la BottomNav prennent le relais.
 *   Sinon on a un double top bar et un footer marketing inutile en app.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const showOnMobile = session === null

  const shellClass = showOnMobile ? '' : 'hidden md:block'

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-space-2 focus:left-space-2
          focus:z-[900] focus:bg-gj-teal focus:text-white focus:px-space-3 focus:py-space-2
          focus:rounded-gj-md focus:text-fs-300 focus:font-bold focus:no-underline"
      >
        Aller au contenu principal
      </a>
      <div className={shellClass}>
        <Header />
      </div>
      <main id="main" className="min-h-screen">{children}</main>
      <div className={shellClass}>
        <Footer />
      </div>
    </>
  )
}
