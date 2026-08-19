/**
 * GUIC-259 (Phase 1) — SLA de traitement d'une escalade Yaye.
 *
 * L'échéance est DÉRIVÉE de la priorité + `createdAt` (pas de colonne stockée : on évite un
 * champ mort comme le statut `en_retard` de la biblio, et l'échéance suit automatiquement
 * toute évolution de la politique). Un signalement de DANGER (priorité 1) a un SLA court —
 * il doit être pris en charge vite. Une escalade résolue n'est jamais « en retard ».
 */

/** SLA en minutes par priorité (0 = normal, 1 = danger). Politique — ajustable. */
export const SLA_MINUTES: Record<number, number> = {
  1: 30, // danger : prise en charge sous 30 min
  0: 24 * 60, // normal : sous 24 h
}

function slaMinutes(priorite: number): number {
  return SLA_MINUTES[priorite] ?? SLA_MINUTES[0]
}

/** Échéance de traitement d'une escalade (createdAt + SLA de sa priorité). */
export function echeanceSla(priorite: number, createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + slaMinutes(priorite) * 60_000)
}

/** Une escalade NON résolue dont l'échéance est passée est en retard SLA. */
export function enRetardSla(
  e: { statut: string; priorite: number; createdAt: Date | string },
  now: Date,
): boolean {
  if (e.statut === 'resolue') return false
  return now > echeanceSla(e.priorite, e.createdAt)
}

/**
 * Condition Prisma « escalades en retard SLA » : non résolues, dont l'ancienneté dépasse le
 * SLA de LEUR priorité. Source unique pour les rappels (re-notification staleness).
 */
export function whereEnRetardSla(now: Date): import('@prisma/client').Prisma.EscaladeYayeWhereInput {
  return {
    statut: { not: 'resolue' },
    OR: Object.entries(SLA_MINUTES).map(([p, mins]) => ({
      priorite: Number(p),
      createdAt: { lt: new Date(now.getTime() - mins * 60_000) },
    })),
  }
}
