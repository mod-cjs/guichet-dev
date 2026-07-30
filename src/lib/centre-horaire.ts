/**
 * Statut d'ouverture d'un centre (GUIC-687 · fiche Centre OV, fidélité maquette).
 * Logique pure (testable) : jour courant + « Ouvert · ferme HH:MM » / « Fermé ».
 */
export type Jour = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche'

export interface HoraireLite {
  jour: string
  ouvert: boolean
  ouvreA: string | null
  fermeA: string | null
}

const JOURS: Jour[] = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

/** Jour de la semaine (enum) pour une date donnée. */
export function jourCourant(now: Date): Jour {
  return JOURS[now.getDay()]
}

function toMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/** Statut d'ouverture à l'instant `now` selon les horaires. */
export function statutOuverture(horaires: HoraireLite[], now: Date): { ouvert: boolean; label: string } {
  const j = jourCourant(now)
  const h = horaires.find((x) => x.jour === j)
  if (!h || !h.ouvert) return { ouvert: false, label: 'Fermé' }
  const open = toMinutes(h.ouvreA)
  const close = toMinutes(h.fermeA)
  const cur = now.getHours() * 60 + now.getMinutes()
  if (open !== null && close !== null && cur >= open && cur < close) {
    return { ouvert: true, label: `Ouvert · ferme ${h.fermeA}` }
  }
  return { ouvert: false, label: 'Fermé' }
}
