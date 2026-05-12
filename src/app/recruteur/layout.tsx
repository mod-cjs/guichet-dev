import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isSessionActive } from '@/lib/session-store'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'

export default async function RecruteurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')
  if (!(await isSessionActive(session.cjsUid))) redirect('/auth/connexion?error=session_expired')

  return (
    <>
      {/* Barre mobile — contexte visuel + espace pour le bouton hamburger */}
      <div
        className="md:hidden sticky top-0 h-12 bg-white border-b border-gj-line flex items-center
          px-space-3"
        style={{ zIndex: 199, paddingTop: 'var(--safe-top)' }}
      >
        <span className="text-color-text-primary font-bold text-fs-300 ml-10">Espace Recruteur</span>
      </div>

      <div className="flex min-h-screen">
        <RecruteurSidebar />
        <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">{children}</main>
      </div>
    </>
  )
}
