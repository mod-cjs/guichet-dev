import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { BottomNav } from '@/components/layout/BottomNav'

export default async function JeuneLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  return (
    <>
      {/* Mobile : app topbar compact */}
      <AppTopbar session={session} />

      {/* Desktop : header marketing complet */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main
        id="main"
        className="min-h-screen container-page py-space-5
          pb-[calc(var(--space-5)+56px+env(safe-area-inset-bottom,0px))]
          md:pb-space-5"
      >
        {children}
      </main>

      {/* Desktop : footer */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile : bottom nav fixe */}
      <BottomNav />
    </>
  )
}
