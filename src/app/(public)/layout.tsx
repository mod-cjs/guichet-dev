import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/ui/SkipLink'

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
      <SkipLink />
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
