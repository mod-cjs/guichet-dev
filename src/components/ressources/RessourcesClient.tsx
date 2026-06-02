'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Chip, EmptyState, Icon, Button } from '@/components/ui'
import { ResourceCard } from './ResourceCard'
import type { RessourceListItem, TypeRessourceValue } from '@/lib/loaders/ressources'

interface RessourcesClientProps {
  initialItems: RessourceListItem[]
  total: number
}

const FILTRES: { value: TypeRessourceValue | 'all'; label: string }[] = [
  { value: 'all',   label: 'Toutes' },
  { value: 'PDF',   label: 'PDF' },
  { value: 'Video', label: 'Vidéos' },
  { value: 'Lien',  label: 'Liens' },
  { value: 'Guide', label: 'Guides' },
  { value: 'Outil', label: 'Outils' },
]

const PAGE_SIZE = 6

/**
 * UI client — recherche + filtres + pagination "Charger plus" sur la liste
 * de ressources rendue côté serveur.
 */
export function RessourcesClient({ initialItems, total }: RessourcesClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeRessourceValue | 'all'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialItems.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      if (!q) return true
      return (
        r.titre.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.theme.toLowerCase().includes(q)
      )
    })
  }, [initialItems, query, type])

  const shown = filtered.slice(0, visible)
  const hasMore = filtered.length > visible

  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex flex-col gap-space-3">
        <div className="relative">
          <span className="absolute left-space-3 top-1/2 -translate-y-1/2 text-color-text-muted pointer-events-none">
            <Icon name="search" size={18} />
          </span>
          <Input
            type="search"
            placeholder="Rechercher une ressource…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une ressource"
            className="pl-[44px]"
          />
        </div>

        <div className="flex flex-wrap gap-space-2" role="group" aria-label="Filtres par type">
          {FILTRES.map((f) => (
            <Chip key={f.value} selected={type === f.value} onClick={() => setType(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="Aucune ressource trouvée"
          description={
            total === 0
              ? 'Aucune ressource publiée pour le moment. Revenez bientôt.'
              : 'Aucune ressource ne correspond à votre recherche.'
          }
          actionLabel="Voir les opportunités"
          onAction={() => router.push('/opportunites')}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
            {shown.map((r) => (
              <li key={r.id}>
                <ResourceCard item={r} />
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center mt-space-2">
              <Button
                variant="ghost"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                aria-label="Charger plus de ressources"
              >
                Charger plus
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
