/**
 * GUIC-616 — Remise à zéro de l'état d'onboarding d'un compte de test.
 *
 * POURQUOI : les parcours PKCE d'`auth-flow.spec.ts` exigent un compte VIERGE (le callback
 * envoie sur /jeune/onboarding tant que `onboardingComplete` est faux — cf.
 * src/app/auth/callback/route.ts:158). Or le `sub` du SSO mock est fixe (`e2e-uid-001`) et la
 * ligne `utilisateurs` SURVIT à la fin du run : au deuxième passage sur la même base, le
 * compte était déjà onboardé → login direct sur le tableau de bord → test rouge.
 *
 * La suite ne passait donc QUE sur une base fraîche. La CI en recrée une à chaque run : elle
 * serait restée verte par chance, en masquant une dépendance à l'état. On rend chaque test
 * autonome plutôt que de compter là-dessus.
 */

import { getPrisma } from './prisma'

/**
 * Repasse le compte en « nouveau bénéficiaire » (onboarding non terminé).
 * Sans effet si le compte n'existe pas encore — le premier login le créera.
 */
export async function resetOnboardingState(cjsUid: string): Promise<void> {
  await getPrisma().utilisateur.updateMany({
    where: { cjsUid },
    data:  { onboardingComplete: false },
  })
}
