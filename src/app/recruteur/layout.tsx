import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'
import { SkipLink } from '@/components/ui/SkipLink'
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
        <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">{children}</main>
      </div>
    </>
  )
}
