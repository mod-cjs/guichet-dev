import { prisma } from '@/lib/prisma'
import { type HomeStats, FALLBACK_HOME_STATS } from './home-stats.shared'

/**
 * Loader Prisma des stats temps réel (écran Welcome onboarding 1/5) — GUIC-235.
 * SERVER ONLY (importe Prisma). Les utilitaires purs (type `HomeStats`,
 * `FALLBACK_HOME_STATS`, `formatHomeStat`) vivent dans `home-stats.shared.ts`
 * pour être importables côté client. On les ré-exporte ici pour compat.
 *
 * - `jeunesInscrits`  : `Utilisateur.count()` filtré sur statut actif, hors soft-delete.
 * - `opportunitesActives` : `Opportunite.count()` publiees, deadline future (ou nulle), hors soft-delete.
 * - `regionsCouvertes` : nombre de régions distinctes côté Centres CJS (proxy stable
 *   `Centre.region` plutôt que `Utilisateur.region` — pas de PII dans le décompte
 *   et garantit l'invariant `regionsCouvertes ≤ 14`).
 * - `centresActifs`   : `Centre.count({ where: { estActif: true } })`.
 *
 * Le calcul est cacheable côté page via `revalidate = 600`.
 */
export { type HomeStats, FALLBACK_HOME_STATS, formatHomeStat } from './home-stats.shared'

export async function loadHomeStats(): Promise<HomeStats> {
  const now = new Date()
  const [jeunes, opps, centresParRegion, centres] = await Promise.all([
    prisma.utilisateur.count({
      where: { statut: 'actif', deletedAt: null },
    }),
    prisma.opportunite.count({
      where: {
        statut: 'publiee',
        deletedAt: null,
        OR: [{ deadline: null }, { deadline: { gte: now } }],
      },
    }),
    prisma.centre.findMany({
      where: { estActif: true },
      distinct: ['region'],
      select: { region: true },
    }),
    prisma.centre.count({ where: { estActif: true } }),
  ])

  return {
    jeunesInscrits: jeunes,
    opportunitesActives: opps,
    regionsCouvertes: centresParRegion.length,
    centresActifs: centres,
  }
}

/**
 * Variante safe pour les Server Components publics — renvoie les valeurs
 * de repli si Prisma échoue (DB down, env de preview sans DATABASE_URL…).
 */
export async function loadHomeStatsSafe(): Promise<HomeStats> {
  try {
    return await loadHomeStats()
  } catch {
    return FALLBACK_HOME_STATS
  }
}
