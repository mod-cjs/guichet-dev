import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  return (
    <>
      {/* Barre mobile — contexte visuel + espace pour le bouton hamburger */}
      <div
        className="md:hidden sticky top-0 h-12 bg-gj-ink flex items-center px-space-3
          border-b border-white/10"
        style={{ zIndex: 199, paddingTop: 'var(--safe-top)' }}
      >
        <span className="text-white font-bold text-fs-300 ml-10">Administration</span>
      </div>

      <div className="flex min-h-screen">
        <AdminSidebar />
        <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">{children}</main>
      </div>
    </>
  )
}
