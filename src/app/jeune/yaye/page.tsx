import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { YayeChat } from './YayeChat'

export const metadata: Metadata = {
  title: 'Yaye — Assistant IA',
}

/**
 * Page Yaye fullscreen mobile (GUIC-194 · Phase 2B-8).
 *
 * Le shell mobile global (AppTopbar + BottomNav) est masqué par MobileShellGate
 * pour donner toute la hauteur au chat (cf `MobileShellGate.tsx`).
 *
 * État local React uniquement (pas de persistance — décision Q4 spec REFONTE-V2 :
 * Yaye matching mocké jusqu'à la Phase 4 / M12 IA).
 */
export default async function YayePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  return <YayeChat prenom={session.prenom ?? undefined} />
}
