import { redirect } from 'next/navigation'

/**
 * Racine `/recruteur` — GUIC-689.
 *
 * Symétrique de `src/app/jeune/page.tsx` (GUIC-446) : l'espace n'avait que des
 * sous-routes et la garde middleware ne couvre que `/recruteur/...`, donc
 * l'URL nue répondait 404. On redirige vers le tableau de bord, point d'entrée
 * de l'espace — le middleware applique ensuite login et contrôle de rôle.
 */
export default function RecruteurIndexPage() {
  redirect('/recruteur/tableau-de-bord')
}
