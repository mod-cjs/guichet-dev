import { prisma } from '@/lib/prisma'

/**
 * Loader pour l'étape onboarding "centre principal" (GUIC-353 W2).
 *
 * `suggestCentrePrincipal` retourne l'id du centre suggéré au jeune en
 * fonction de sa région SSO. Si la région est absente ou aucun centre
 * actif n'existe dans la région, retourne `null`.
 */
export async function suggestCentrePrincipal(session: {
  region?: string | null
  cjsUid: string
}): Promise<string | null> {
  if (!session.region) return null
  const c = await prisma.centre.findFirst({
    where: { estActif: true, region: session.region as never },
    orderBy: [{ nom: 'asc' }],
    select: { id: true },
  })
  return c?.id ?? null
}

/**
 * Région effective du jeune pour l'onboarding — GUIC-448.
 *
 * La région saisie à l'étape « profil » est persistée en base (PUT step 2) mais
 * **pas** rafraîchie dans le JWT de session. Pour la plupart des comptes le token
 * SSO ne porte aucune région : `session.region` est donc périmé/`null` à l'étape
 * centre-principal, ce qui cassait la suggestion. La base fait foi.
 */
export function resolveOnboardingRegion(
  dbRegion: string | null | undefined,
  sessionRegion: string | null | undefined,
): string | null {
  return dbRegion ?? sessionRegion ?? null
}

/** Lit la région enregistrée en base pour un jeune (source de vérité). */
export async function getUserRegion(cjsUid: string): Promise<string | null> {
  const u = await prisma.utilisateur.findUnique({
    where:  { cjsUid },
    select: { region: true },
  })
  return u?.region ?? null
}
