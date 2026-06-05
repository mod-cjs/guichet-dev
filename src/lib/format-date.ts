/**
 * Formatage de dates — helpers UI Guichet Jeunesse.
 *
 * `formatDeadline()` retourne un libellé compact pour les dates d'échéance :
 *  - même année que `now` → "12 juin" (sans année)
 *  - année différente    → "12 juin 2027"
 *
 * GUIC-221 — Wave 7-A (cohérence catalogue + détail).
 */

const COMPACT_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const FULL_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Format compact (sans année si année courante), avec fallback ISO si invalide. */
export function formatDeadline(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'Sans échéance'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (d.getFullYear() === now.getFullYear()) return COMPACT_FMT.format(d)
  return FULL_FMT.format(d)
}

/** Format long (toujours avec année) — pour `title` tooltip natif. */
export function formatDeadlineFull(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return FULL_FMT.format(d)
}
