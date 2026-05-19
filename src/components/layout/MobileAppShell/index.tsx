import { getSession } from '@/lib/auth'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileShellGate } from './MobileShellGate'

/**
 * Top bar mobile du shell global pour user connecté.
 * À rendre AVANT {children} dans le root layout pour que `sticky top-0` fonctionne
 * (l'élément doit être en haut du flow DOM).
 */
export async function MobileTopShell() {
  const session = await getSession()
  if (!session) return null
  return (
    <MobileShellGate>
      <AppTopbar session={session} />
    </MobileShellGate>
  )
}

/**
 * Bottom nav mobile du shell global pour user connecté.
 * À rendre APRÈS {children} dans le root layout (cohérent avec `fixed bottom-0`).
 */
export async function MobileBottomShell() {
  const session = await getSession()
  if (!session) return null
  return (
    <MobileShellGate>
      <BottomNav />
    </MobileShellGate>
  )
}
