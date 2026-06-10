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
