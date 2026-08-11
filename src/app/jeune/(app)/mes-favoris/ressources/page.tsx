import type { Metadata } from 'next'
import Link from 'next/link'
import { MesRessourcesFavorites } from '@/components/jeune/MesRessourcesFavorites'

export const metadata: Metadata = { title: 'Mes ressources favorites' }

/**
 * GUIC-24 — Page dédiée des ressources favorites.
 * Route enfant volontairement séparée de `/jeune/mes-favoris` pour ne pas
 * entrer en conflit avec la PR #68 (GUIC-191) qui refactore `MesFavoris`.
 * Un toggle global "Opportunités / Ressources" sera ajouté dans une PR suite.
 */
export default function MesRessourcesFavoritesPage() {
  return (
    <div>
      <div className="mb-space-5">
        <Link
          href="/jeune/mes-favoris"
          className="inline-flex items-center gap-1 text-fs-200 font-black text-gj-grey hover:text-gj-ink mb-space-2"
        >
          ← Mes sauvegardes (opportunités)
        </Link>
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes ressources favorites</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Les ressources que vous avez sauvegardées
        </p>
      </div>
      <MesRessourcesFavorites />
    </div>
  )
}
