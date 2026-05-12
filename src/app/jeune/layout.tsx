import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isSessionActive } from '@/lib/session-store'

export default async function JeuneRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (!(await isSessionActive(session.cjsUid))) redirect('/auth/connexion?error=session_expired')
  return <>{children}</>
}
