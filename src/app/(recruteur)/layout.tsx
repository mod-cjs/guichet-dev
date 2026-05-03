import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'

export default async function RecruteurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')
  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <RecruteurSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </>
  )
}
