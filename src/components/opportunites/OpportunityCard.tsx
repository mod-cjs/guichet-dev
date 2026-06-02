'use client'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import type { OpportuniteListItem } from '@/types/opportunite'

interface OpportunityCardProps {
  item: OpportuniteListItem
  isFavori: boolean
  onToggleFavori: (id: string) => void
}

const DAY = 86_400_000
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Libellé d'échéance + drapeau d'urgence (deadline ≤ 7 jours). */
function deadlineInfo(iso: string | null): { label: string; urgent: boolean } | null {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - Date.now()) / DAY)
  return { label: `Échéance : ${dateFmt.format(d)}`, urgent: days <= 7 }
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ')
}

/**
 * Icône favori — utilise le sprite global (`bookmark`) au lieu d'un SVG inline.
 * Conservée pour compat (re-exportée par `OpportuniteDetail.tsx`) jusqu'à
 * la migration `MesFavoris` → `OppCard` v2 (post-merge PR #42).
 */
export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Icon
      name="bookmark"
      size={22}
      aria-hidden
      style={{ fill: filled ? 'currentColor' : 'none' }}
    />
  )
}

/** Carte d'opportunité du catalogue (GUIC-20). */
export function OpportunityCard({ item, isFavori, onToggleFavori }: OpportunityCardProps) {
  const dl = deadlineInfo(item.deadline)

  return (
    <Card accent={dl?.urgent ? 'red' : 'teal'} className="relative flex flex-col gap-space-2">
      {/* Lien étiré : toute la carte est cliquable sans imbriquer le bouton favori. */}
      <Link
        href={`/opportunites/${item.slug}`}
        aria-label={`Voir l'opportunité : ${item.titre}`}
        className="absolute inset-0 rounded-gj-lg"
      />

      <div className="flex items-start justify-between gap-space-2">
        <h3 className="text-fs-400 font-black text-color-text-primary line-clamp-2">
          {item.titre}
        </h3>
        <button
          type="button"
          onClick={() => onToggleFavori(item.id)}
          aria-pressed={isFavori}
          aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="relative z-[1] flex-shrink-0 min-h-[var(--tap-min)] min-w-[var(--tap-min)]
            flex items-center justify-center rounded-gj-pill text-gj-teal
            hover:bg-gj-teal-soft transition-colors"
        >
          <HeartIcon filled={isFavori} />
        </button>
      </div>

      <p className="text-fs-200 text-color-text-secondary">{item.organisation}</p>

      <div className="flex flex-wrap items-center gap-space-1">
        <Badge variant="teal">{humanize(item.type)}</Badge>
        {item.region && <Badge variant="grey">{humanize(item.region)}</Badge>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-space-1 mt-space-1">
        {dl && (
          <span
            className={`text-fs-200 font-bold ${
              dl.urgent ? 'text-gj-red' : 'text-color-text-secondary'
            }`}
          >
            {dl.label}
          </span>
        )}
        {item.remuneration && (
          <span className="text-fs-200 font-bold text-gj-teal-deep">{item.remuneration}</span>
        )}
      </div>
    </Card>
  )
}
