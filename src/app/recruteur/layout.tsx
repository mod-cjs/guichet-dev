import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'
import { RecruteurSearch } from '@/components/layout/RecruteurSearch'
import { SkipLink } from '@/components/ui/SkipLink'
import { getRecruteurContext } from '@/lib/loaders/recruteur'
import { countUnreadNotifications } from '@/lib/loaders/notifications'

export default async function RecruteurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)
  const unread = await countUnreadNotifications(session.cjsUid)

  return (
    <>
      <SkipLink />
      {/* Barre mobile — chip entreprise (design v3 Lot 10, accent bleu). */}
      <div
        className="md:hidden sticky top-0 bg-white border-b border-gj-line flex items-center
          px-space-3"
        style={{
          zIndex: 199,
          paddingTop: 'var(--safe-top)',
          minHeight: 'var(--gj-topbar-h)',
        }}
      >
        <span className="font-bold text-fs-300 ml-10" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          {ctx.organisationNom || 'Espace Recruteur'}
        </span>
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
            <div className="flex items-center gap-2" style={{ background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 42, width: 260 }}>
              <Icon name="search" size={16} />
              <input placeholder="Rechercher un candidat…" className="flex-1 bg-transparent outline-none border-0 text-[13.5px]" style={{ color: 'var(--gj-ink)' }} />
            </div>
            <Link href="/recruteur/notifications" aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ''}`} className="relative inline-flex items-center justify-center no-underline" style={{ width: 42, height: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)', flexShrink: 0 }}>
              <Icon name="bell" size={18} />
              {unread > 0 && (
                <span aria-hidden style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--gj-red, #DC2626)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{unread > 9 ? '9+' : unread}</span>
              )}
            </Link>
            <span aria-hidden style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {(ctx.prenom.slice(0, 1) || 'R').toUpperCase()}
            </span>
          </div>
          <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">{children}</main>
        </div>
      </div>
    </>
  )
}
