import { getSession } from '@/lib/auth'
import { masquesUtilisateur } from '@/lib/flags/ui-server'
import { lienMasque } from '@/lib/flags/ui'
import { BOTTOM_NAV_ITEMS } from '@/components/ui/BottomNav/nav'
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
  const masques = await masquesUtilisateur(session.roles)
  // GUIC-247 — badge cloche : non-lues lues côté serveur (best-effort).
  const unread = await countUnreadNotifications(session.cjsUid).catch(() => 0)
  // GUIC-447 — présence photo (best-effort) pour éviter le 404 proxy.
  const hasPhoto = await getHasProfilePhoto(session.cjsUid).catch(() => false)
  return (
    <MobileShellGate>
      <AppTopbar masques={masques} session={session} unread={unread} hasPhoto={hasPhoto} />
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
  // GUIC-706 — trois des cinq items sont masquables. Calcul côté serveur : côté client,
  // la barre s'afficherait complète le temps du premier rendu.
  const masques = await masquesUtilisateur(session.roles)
  return (
    <MobileShellGate>
      <BottomNav items={BOTTOM_NAV_ITEMS.filter((i) => !lienMasque(i.href, masques))} />
    </MobileShellGate>
  )
}
