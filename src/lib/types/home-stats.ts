/**
 * Types & valeurs de repli pour les stats homepage — GUIC-235.
 *
 * Fichier scindé du loader `@/lib/loaders/home-stats` qui, lui, importe
 * Prisma (mariadb driver côté serveur). En isolant le type et le fallback
 * ici, les composants client (WelcomeHeroMobile/Web) peuvent les consommer
 * sans bundler tout Prisma.
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

/** Format helper pour afficher un nombre en fr-FR (espaces fines). */
export function formatHomeStat(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}
