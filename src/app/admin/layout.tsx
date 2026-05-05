import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">{children}</main>
    </div>
  )
}
