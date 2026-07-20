import type { FrequenceVeille } from '@prisma/client'

/**
 * GUIC-597 — US-2 : conversion fréquence de veille → durée, et calcul de la
 * prochaine échéance de vérification d'une source.
 */
const H = 3_600_000

const INTERVALLES: Record<FrequenceVeille, number> = {
  horaire: H,
  six_heures: 6 * H,
  quotidienne: 24 * H,
  hebdomadaire: 7 * 24 * H,
}

export function intervalleMs(frequence: FrequenceVeille): number {
  return INTERVALLES[frequence]
}

export function prochaineVerif(frequence: FrequenceVeille, base: Date): Date {
  return new Date(base.getTime() + intervalleMs(frequence))
}
