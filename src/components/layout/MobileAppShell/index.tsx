import { getSession } from '@/lib/auth'
import { BottomNav } from '@/components/ui/BottomNav'
import { MobileShellGate } from './MobileShellGate'
import { MobileTopShellClient } from './MobileTopShellClient'

/**
 * Top bar mobile du shell global pour user connecté.
 * À rendre AVANT {children} dans le root layout pour que `sticky top-0` fonctionne
 * (l'élément doit être en haut du flow DOM).
 *
 * Délègue à `MobileTopShellClient` pour câbler le clic cloche → drawer
 * notifications et le clic Yaye → /jeune/yaye (GUIC-194).
 */
export async function MobileTopShell() {
  const session = await getSession()
  if (!session) return null
  return (
    <MobileShellGate>
      <MobileTopShellClient session={session} />
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
