import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { SkipLink } from '@/components/ui/SkipLink'
import { AdminTopBar } from '@/components/layout/AdminSidebar/AdminTopBar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  // Dériver les infos utilisateur depuis la session pour la carte sidebar
  const userName = `${session.prenom} ${session.nom}`.trim() || 'Admin national'
  const userRole = 'Administrateur national'
  const userInitials =
    `${session.prenom?.[0] ?? ''}${session.nom?.[0] ?? ''}`.toUpperCase() || 'AN'

  return (
    <>
      <SkipLink />

      {/* ── Barre mobile contexte sombre (Lot 11) ─────────────────────── */}
      <div
        className="md:hidden sticky top-0 flex items-center px-space-3
          border-b border-white/10"
        style={{
          zIndex: 199,
          paddingTop: 'var(--safe-top)',
          minHeight: 'var(--gj-topbar-h)',
          background: 'var(--gj-admin-bg)',
          color: 'var(--gj-admin-fg)',
        }}
      >
        {/* espace pour le bouton hamburger rendu dans AdminSidebar */}
        <span
          className="font-bold ml-10"
          style={{ fontSize: 14, color: 'var(--gj-admin-fg)' }}
        >
          Administration
        </span>
      </div>

      <div className="flex min-h-screen">
        <AdminSidebar
          userName={userName}
          userRole={userRole}
          userInitials={userInitials}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Topbar desktop (blanc, clair) ─────────────────────────── */}
          <AdminTopBar />

          <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
