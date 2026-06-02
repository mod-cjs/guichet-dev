'use client'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { OpportuniteTypeChip } from './OpportuniteTypeChip'
import { regionLabel } from '@/lib/regions'
import type { OpportuniteListItem } from '@/types/opportunite'

/**
 * <OppCard /> — carte mobile-first du catalogue d'opportunités (GUIC-188).
 *
 * Design v2 (lot3-opps-mobile · MobileOppRowCard) :
 * - en-tête : chip type colorée + (slot match) + bouton favori
 * - titre · organisation
 * - métadonnées : pin région · funding rémunération · clock deadline
 * - bordure rouge soft + deadline en rouge quand urgent (≤ 7 jours)
 *
 * Pas de bouton imbriqué : un lien étiré couvre la carte et le bouton favori
 * vit en `z-index` au-dessus (pattern Card · refonte v2).
 */

const DAY = 86_400_000
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

interface DeadlineInfo {
  label: string
  urgent: boolean
}

/** Étiquette compacte + urgence si deadline dans les 7 jours. */
export function buildDeadlineInfo(iso: string | null, now: number = Date.now()): DeadlineInfo | null {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - now) / DAY)
  if (days < 0) return { label: 'Clôturée', urgent: false }
  if (days === 0) return { label: "Aujourd'hui", urgent: true }
  if (days <= 7) return { label: `J-${days}`, urgent: true }
  return { label: dateFmt.format(d), urgent: false }
}

export interface OppCardProps {
  item: OpportuniteListItem
  isFavori: boolean
  onToggleFavori: (id: string) => void
  /** Score de matching (0–100) — réservé. Pas affiché si null. */
  matchScore?: number | null
}

export function OppCard({ item, isFavori, onToggleFavori, matchScore = null }: OppCardProps) {
  const dl = buildDeadlineInfo(item.deadline)
  const region = regionLabel(item.region)
  const borderClass = dl?.urgent ? 'border-gj-red' : 'border-gj-line'

  return (
    <article
      data-testid="opp-card"
      className={`relative bg-gj-surface border-[1.5px] ${borderClass} rounded-gj-lg p-space-3
        flex flex-col gap-space-2`}
    >
      {/* Lien étiré — toute la carte est cliquable, pas de bouton imbriqué. */}
      <Link
        href={`/opportunites/${item.slug}`}
        aria-label={`Voir l'opportunité : ${item.titre}`}
        className="absolute inset-0 rounded-gj-lg focus:outline-none
          focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
      />

      <div className="flex items-center gap-space-1 flex-wrap">
        <OpportuniteTypeChip
          type={item.type}
          tone={dl?.urgent ? 'red' : undefined}
          suffix={dl?.urgent ? dl.label : undefined}
        />
        {matchScore !== null && matchScore !== undefined && (
          <span
            data-testid="match-score"
            className="inline-flex items-center px-space-2 py-[2px] rounded-gj-pill
              text-fs-100 font-black uppercase tracking-[0.3px] leading-none
              bg-gj-green-soft text-gj-green-ink"
          >
            {matchScore}%
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleFavori(item.id)}
          aria-pressed={isFavori}
          aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`relative z-[1] ml-auto inline-flex items-center justify-center
            w-[36px] h-[36px] rounded-full border-[1.5px] transition-colors
            ${isFavori
              ? 'bg-gj-yellow-soft border-gj-yellow text-gj-yellow-ink'
              : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong'}`}
        >
          <Icon name="bookmark" size={16} />
        </button>
      </div>

      <h3 className="text-fs-400 font-black text-color-text-primary leading-snug line-clamp-2">
        {item.titre}
      </h3>
      <p className="text-fs-200 text-color-text-secondary">{item.organisation}</p>

      <div className="flex flex-wrap items-center gap-x-space-3 gap-y-space-1 text-fs-200 text-color-text-secondary">
        {region && (
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={14} />
            {region}
          </span>
        )}
        {item.remuneration && (
          <span className="inline-flex items-center gap-1">
            <Icon name="funding" size={14} />
            {item.remuneration}
          </span>
        )}
        {dl && (
          <span
            className={`inline-flex items-center gap-1 ${
              dl.urgent ? 'text-gj-red font-black' : ''
            }`}
          >
            <Icon name="clock" size={14} />
            {dl.urgent ? dl.label : `Échéance : ${dl.label}`}
          </span>
        )}
      </div>
    </article>
  )
}
