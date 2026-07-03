'use client'

import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'
import { htmlToPlainText } from '@/lib/rich-html'

export type RessourceCardType =
  | 'Salle'
  | 'Vehicule'
  | 'Poste_info'
  | 'Equipement'
  | 'Atelier_recurrent'

export interface RessourceCardProps {
  ressource: {
    id: string
    type: RessourceCardType | string
    nom: string
    description?: string | null
    imageUrl?: string | null
    capacite: number
    capaciteUnit?: string | null
    dureeMinCreneauMin: number
    requiresJustif: boolean
    estActive: boolean
  }
  centreSlug: string
  onReserveClick?: () => void
  className?: string
}

const TYPE_ICON: Record<string, IconName> = {
  Salle: 'users',
  Vehicule: 'car',
  Poste_info: 'desktop',
  Equipement: 'bolt',
  Atelier_recurrent: 'calendar',
}

const TYPE_LABEL: Record<string, string> = {
  Salle: 'Salle',
  Vehicule: 'Véhicule',
  Poste_info: 'Poste info',
  Equipement: 'Équipement',
  Atelier_recurrent: 'Atelier récurrent',
}

/**
 * <RessourceCard> — variante riche pour la liste `/centres/[slug]/ressources` (W4).
 *
 * Inclut description, méta complète (capacité + durée + justif requis), badge
 * Gratuit et CTA Réserver. Tap-min 44px. Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function RessourceCard({
  ressource,
  centreSlug,
  onReserveClick,
  className = '',
}: RessourceCardProps) {
  const iconName: IconName = TYPE_ICON[ressource.type] ?? 'document'
  const typeLabel = TYPE_LABEL[ressource.type] ?? ressource.type
  const unit = ressource.capaciteUnit ?? 'pers.'
  const dureeMin = ressource.dureeMinCreneauMin

  return (
    <article
      data-testid="ressource-card"
      aria-label={`${typeLabel} ${ressource.nom}`}
      className={`flex flex-col sm:flex-row sm:items-center ${className}`.trim()}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: 14,
        gap: 14,
      }}
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: 'var(--gj-teal-soft)',
          color: 'var(--gj-teal-deep)',
          flexShrink: 0,
        }}
      >
        <Icon name={iconName} size={26} />
      </div>

      <div className="min-w-0 flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: 'var(--gj-ink)',
              lineHeight: 1.25,
            }}
          >
            {ressource.nom}
          </span>
          <span
            aria-hidden="true"
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: 'var(--gj-green-ink)',
              background: 'var(--gj-green-soft)',
              padding: '3px 10px',
              borderRadius: 999,
            }}
          >
            Gratuit
          </span>
        </div>

        {ressource.description ? (
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--gj-grey)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {htmlToPlainText(ressource.description)}
          </p>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: 11.5,
            color: 'var(--gj-grey)',
            fontWeight: 600,
          }}
        >
          <span>
            {typeLabel} · {ressource.capacite} {unit}
          </span>
          <span aria-hidden="true">·</span>
          <span>Créneau min {dureeMin} min</span>
          {ressource.requiresJustif ? (
            <>
              <span aria-hidden="true">·</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'var(--gj-yellow-ink)',
                  background: 'var(--gj-yellow-soft)',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                Justif requis
              </span>
            </>
          ) : null}
        </div>
      </div>

      <Link
        href={`/centres/${centreSlug}/ressources/${ressource.id}/reserver`}
        onClick={onReserveClick}
        aria-label={`Réserver ${ressource.nom}`}
        className="inline-flex items-center justify-center"
        style={{
          background: 'var(--gj-teal-deep)',
          color: 'var(--gj-surface)',
          padding: '10px 16px',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 13,
          textDecoration: 'none',
          minHeight: 44,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      >
        Réserver
      </Link>
    </article>
  )
}
