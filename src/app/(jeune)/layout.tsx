import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default async function JeuneLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  return (
    <>
      <Header />
      <main className="min-h-screen container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </>
  )
}
