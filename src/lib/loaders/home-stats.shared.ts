/**
 * Utilitaires « home stats » sûrs côté client (GUIC-235) — AUCUN import serveur
 * (pas de Prisma/mariadb), pour être importables depuis des Client Components
 * (écrans Welcome onboarding) sans embarquer le driver DB dans le bundle.
 *
 * Le loader Prisma vit dans `home-stats.ts` (server only) qui ré-exporte ce module.
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

const NF_FR = new Intl.NumberFormat('fr-FR')

/** Formate `22695` → `"22 695"` (espace insécable U+202F via Intl fr-FR). */
export function formatHomeStat(value: number): string {
  return NF_FR.format(value)
}
