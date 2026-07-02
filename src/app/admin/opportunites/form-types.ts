import type { PrismaClient } from '@prisma/client'
import type { SousTypeSlug } from '@/lib/services/opportunite-service'

/** Les 10 sous-types techniques (slug `OpportuniteType.slug`). */
export const SUBTYPE_SLUGS: SousTypeSlug[] = [
  'emploi', 'stage', 'formation', 'bourse', 'concours',
  'appel_a_projets', 'financement', 'mentorat', 'mobilite', 'volontariat',
]

const KNOWN = new Set<string>(SUBTYPE_SLUGS)

/**
 * Charge les types d'opportunité actifs proposables dans le formulaire admin,
 * restreints aux 10 sous-types gérés (le formulaire ne sait écrire que ceux-là).
 */
export async function loadFormTypes(
  db: Pick<PrismaClient, 'opportuniteType'>,
): Promise<{ slug: SousTypeSlug; libelle: string }[]> {
  const rows = await db.opportuniteType.findMany({
    where: { actif: true },
    orderBy: { ordre: 'asc' },
    select: { slug: true, libelle: true },
  })
  return rows
    .filter((t) => KNOWN.has(t.slug))
    .map((t) => ({ slug: t.slug as SousTypeSlug, libelle: t.libelle }))
}
