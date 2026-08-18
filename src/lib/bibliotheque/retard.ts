import type { Prisma } from '@prisma/client'

/**
 * GUIC-522 — Retard d'emprunt : SOURCE UNIQUE DE VÉRITÉ.
 *
 * Le statut `en_retard` n'est jamais matérialisé en base (aucune transition ne l'écrit) :
 * un emprunt est en retard s'il est `en_cours` et que sa `dateRetourPrevue` est passée.
 * Un `en_retard` stocké (legacy éventuel) compte aussi. Utiliser CES deux helpers partout
 * (admin, conseiller, rappels) évite les compteurs `statut='en_retard'` → toujours 0.
 */
export function estEnRetard(e: { statut: string; dateRetourPrevue: Date | string | null }, now: Date): boolean {
  if (e.statut === 'en_retard') return true
  if (e.statut !== 'en_cours' || e.dateRetourPrevue == null) return false
  return new Date(e.dateRetourPrevue) < now
}

/** Condition Prisma équivalente, pour les `count`/`where`. */
export function whereEnRetard(now: Date): Prisma.EmpruntWhereInput {
  return { OR: [{ statut: 'en_retard' }, { statut: 'en_cours', dateRetourPrevue: { lt: now } }] }
}
