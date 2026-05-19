import { getSession } from '@/lib/auth'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileShellPadding } from './MobileShellPadding'

/**
 * Shell mobile global : rend AppTopbar + BottomNav pour tout utilisateur connecté,
 * sur toutes les routes sauf /admin/* et /recruteur/* (qui ont leur sidebar).
 * Rendu dans le root layout pour éviter la perte de nav lors de la navigation
 * entre routes publiques (/opportunites, etc.) et privées (/jeune/*).
 */
export async function MobileAppShell() {
  const session = await getSession()
  if (!session) return null

  return (
    <MobileShellPadding>
      <AppTopbar session={session} />
      <BottomNav />
    </MobileShellPadding>
  )
}
