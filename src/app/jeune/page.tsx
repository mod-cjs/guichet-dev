import { redirect } from 'next/navigation'

/**
 * Racine `/jeune` — GUIC-446.
 *
 * `/jeune` n'avait pas de page propre (seulement un layout + sous-routes via le
 * groupe `(app)`), ce qui renvoyait un 404 (fil d'Ariane « Mon espace », prefetch
 * RSC). On redirige vers le tableau de bord, point d'entrée de l'espace jeune.
 */
export default function JeuneIndexPage() {
  redirect('/jeune/tableau-de-bord')
}
