import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'
import { RecruteurSearch } from '@/components/layout/RecruteurSearch'
import { RecruteurBottomNav } from '@/components/layout/RecruteurBottomNav'
import { SkipLink } from '@/components/ui/SkipLink'
import { Icon } from '@/components/ui/Icon'
import { getRecruteurContext } from '@/lib/loaders/recruteur'
import { countUnreadNotifications } from '@/lib/loaders/notifications'

function BellLink({ unread, size, boxed }: { unread: number; size: number; boxed?: boolean }) {
  return (
    <Link
      href="/recruteur/notifications"
      aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ''}`}
      className="relative inline-flex items-center justify-center no-underline"
      style={boxed
        ? { width: 42, height: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)', flexShrink: 0 }
        : { width: 40, height: 40, color: 'var(--gj-ink)', flexShrink: 0 }}
    >
      <Icon name="bell" size={size} />
      {unread > 0 && (
        <span aria-hidden style={{ position: 'absolute', top: boxed ? -5 : 2, right: boxed ? -5 : 2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--gj-red, #DC2626)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

export default async function RecruteurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)
  const unread = await countUnreadNotifications(session.cjsUid)

  return (
    <>
      <SkipLink />
      {/* Barre mobile — chip entreprise + cloche (design v4). */}
      <div
        className="md:hidden sticky top-0 bg-white border-b border-gj-line flex items-center gap-2 px-space-3"
        style={{ zIndex: 199, paddingTop: 'var(--safe-top)', minHeight: 'var(--gj-topbar-h)' }}
      >
        <span className="font-bold text-fs-300 flex-1 truncate" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          {ctx.organisationNom || 'Espace Recruteur'}
        </span>
        <BellLink unread={unread} size={20} />
      </div>

      <div className="flex min-h-screen">
        <RecruteurSidebar companyName={ctx.organisationNom} verified={ctx.estVerifie} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* TopBar desktop (design v3 Lot 10) : recherche + notifications + avatar */}
          <div
            className="hidden md:flex items-center gap-[14px]"
            style={{ background: '#fff', borderBottom: '1px solid var(--gj-line)', padding: '0 24px', minHeight: 64 }}
          >
            <div className="flex-1" />
            <RecruteurSearch />
            <BellLink unread={unread} size={18} boxed />
            <span aria-hidden style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {(ctx.prenom.slice(0, 1) || 'R').toUpperCase()}
            </span>
          </div>
          {/* Padding bas mobile = hauteur de la bottom-nav (GUIC-492). */}
          <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0 pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-space-6">{children}</main>
        </div>
      </div>

      <RecruteurBottomNav />
    </>
  )
}
