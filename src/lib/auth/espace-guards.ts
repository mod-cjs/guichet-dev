/**
 * GUIC-526 — Guard partagé des PAGES de l'espace conseiller.
 *
 * En App Router, les pages s'exécutent EN PARALLÈLE de leur layout : un
 * `redirect('/')` dans une page gagnerait sur l'écran d'attente rendu par le
 * layout. Chaque page conseiller remplace donc son `if (!ctx) redirect('/')`
 * par `if (!ctx) return conseillerSansRattachement(session.roles)`.
 */

import { redirect } from 'next/navigation'
import { isConseillerRole } from '@/lib/auth/espace-roles'

/**
 * À appeler quand `getConseillerContext` ne renvoie rien :
 * - rôle SSO conseiller → `null` (le layout affiche l'écran d'attente D1)
 * - sinon → redirection accueil (comportement historique)
 */
export function conseillerSansRattachement(
  roles: readonly string[] | null | undefined,
): null {
  if (isConseillerRole(roles)) return null
  redirect('/')
}
