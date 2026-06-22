import { getSession } from '@/lib/auth'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { countUnreadNotifications } from '@/lib/loaders/notifications'
import { getHasProfilePhoto } from '@/lib/loaders/profil-photo'
import { MobileShellGate } from './MobileShellGate'

/**
 * Top bar mobile du shell global pour user connecté.
 * À rendre AVANT {children} dans le root layout pour que `sticky top-0` fonctionne
 * (l'élément doit être en haut du flow DOM).
 */
export async function MobileTopShell() {
  const session = await getSession()
  if (!session) return null
  // GUIC-247 — badge cloche : non-lues lues côté serveur (best-effort).
  const unread = await countUnreadNotifications(session.cjsUid).catch(() => 0)
  // GUIC-447 — présence photo (best-effort) pour éviter le 404 proxy.
  const hasPhoto = await getHasProfilePhoto(session.cjsUid).catch(() => false)
  return (
    <MobileShellGate>
      <AppTopbar session={session} unread={unread} hasPhoto={hasPhoto} />
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
