/**
 * GUIC-689 (M4) — Formulation du résultat d'un scan.
 *
 * Extrait du composant pour être testable : l'écran annonçait « Présent
 * confirmé » quel que soit le sens, donc une arrivée à quelqu'un qui part.
 */

/** « 95 » → « 1 h 35 » ; « 45 » → « 45 min ». */
function dureeLisible(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function messageDePassage(
  sens: 'entree' | 'sortie',
  nom: string,
  dureeMinutes: number | null,
): string {
  if (sens === 'entree') return `Arrivée confirmée : ${nom}`

  // `null` = aucune entrée appariée. On le DIT, plutôt que d'omettre la durée
  // en silence : le staff doit pouvoir corriger si l'entrée a été manquée.
  if (dureeMinutes === null) return `Sortie confirmée : ${nom} — entrée non retrouvée`

  // 0 est une durée réelle (visite éclair), pas une absence de mesure.
  return `Sortie confirmée : ${nom} — ${dureeLisible(dureeMinutes)} sur place`
}
