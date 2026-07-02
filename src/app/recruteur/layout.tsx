import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'
import { SkipLink } from '@/components/ui/SkipLink'
import { Icon } from '@/components/ui/Icon'
import { getRecruteurContext } from '@/lib/loaders/recruteur'

export default async function RecruteurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)

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
