import { ResourceCard } from './ResourceCard'
import type { RessourceListItem } from '@/lib/loaders/ressources'

interface RessourceRelatedListProps {
  items: RessourceListItem[]
}

/**
 * Liste « Ressources liées » sur la page détail — GUIC-363.
 * Affiche jusqu'à 3 ressources sélectionnées par thème/catégorie.
 * Pas de favoris ici (lecture courte sans action).
 */
export function RessourceRelatedList({ items }: RessourceRelatedListProps) {
  if (items.length === 0) return null
  return (
    <section
      aria-labelledby="ressource-related-title"
      className="flex flex-col gap-space-3"
      data-testid="ressource-related"
    >
      <h2
        id="ressource-related-title"
        className="text-fs-500 font-black text-color-text-primary"
      >
        Ressources liées
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-3 list-none p-0 m-0">
        {items.map((r) => (
          <li key={r.id}>
            <ResourceCard item={r} />
          </li>
        ))}
      </ul>
    </section>
  )
}
