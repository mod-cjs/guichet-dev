import { prisma } from '@/lib/prisma'

/**
 * Stats temps réel affichées sur l'écran Welcome (onboarding 1/5) — GUIC-235.
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
export interface HomeStats {
  jeunesInscrits: number
  opportunitesActives: number
  regionsCouvertes: number
  centresActifs: number
}

/** Valeurs de repli affichées si la base est indisponible (snapshot CJS 2026-05). */
export const FALLBACK_HOME_STATS: HomeStats = {
  jeunesInscrits: 22_695,
  opportunitesActives: 1_240,
  regionsCouvertes: 14,
  centresActifs: 9,
}

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

const NF_FR = new Intl.NumberFormat('fr-FR')

/** Formate `22695` → `"22 695"` (espace insécable U+202F via Intl fr-FR). */
export function formatHomeStat(value: number): string {
  return NF_FR.format(value)
}
