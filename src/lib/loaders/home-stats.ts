import 'server-only'
import { prisma } from '@/lib/prisma'
import { type HomeStats, FALLBACK_HOME_STATS, formatHomeStat } from '@/lib/types/home-stats'

export { type HomeStats, FALLBACK_HOME_STATS, formatHomeStat }

/**
 * Stats temps réel affichées sur la home publique — GUIC-235.
 *
 * - `jeunesInscrits`  : `Utilisateur.count()` filtré sur statut actif, hors soft-delete.
 * - `opportunitesActives` : `Opportunite.count()` publiees, deadline future (ou nulle), hors soft-delete.
 * - `regionsCouvertes` : nombre de régions distinctes côté Centres CJS (proxy stable
 *   `Centre.region` plutôt que `Utilisateur.region` — pas de PII dans le décompte
 *   et garantit l'invariant `regionsCouvertes ≤ 14`).
 * - `centresActifs`   : `Centre.count({ where: { estActif: true } })`.
 *
 * Le calcul est cacheable côté page via `revalidate = 600`.
 * Marquage `server-only` : le loader ne doit JAMAIS être bundle côté client
 * (Prisma + mariadb driver). Les composants client utilisent les types via
 * `@/lib/types/home-stats`.
 */

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

// formatHomeStat est désormais ré-exporté depuis @/lib/types/home-stats
// (déplacé pour permettre l'usage côté client sans bundler Prisma).
