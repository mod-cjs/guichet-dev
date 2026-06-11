'use client'

import { Icon, type IconName } from '@/components/ui/Icon'

export type RessourceTeaserType =
  | 'Salle'
  | 'Vehicule'
  | 'Poste_info'
  | 'Equipement'
  | 'Atelier_recurrent'

export interface RessourceCardTeaserProps {
  ressource: {
    id: string
    type: RessourceTeaserType | string
    nom: string
    capacite: number
    capaciteUnit?: string | null
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
 * <RessourceCardTeaser> — card minimaliste de ressource réservable
 * affichée sur la page détail centre (4 max). Une vue plus riche existe en W4.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export function RessourceCardTeaser({
  ressource,
  centreSlug,
  onReserveClick,
  className = '',
}: RessourceCardTeaserProps) {
  const iconName: IconName = TYPE_ICON[ressource.type] ?? 'document'
  const typeLabel = TYPE_LABEL[ressource.type] ?? ressource.type
  const unit = ressource.capaciteUnit ?? (ressource.capacite > 1 ? 'pers.' : 'pers.')

  return (
    <article
      data-testid="ressource-teaser"
      className={`flex items-center ${className}`.trim()}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 12,
        padding: 12,
        gap: 12,
      }}
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--gj-teal-soft)',
          color: 'var(--gj-teal-deep)',
          flexShrink: 0,
        }}
      >
        <Icon name={iconName} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: 'var(--gj-ink)',
            lineHeight: 1.25,
          }}
        >
          {ressource.nom}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--gj-grey)',
            marginTop: 2,
          }}
        >
          {typeLabel} · {ressource.capacite} {unit}
        </div>
      </div>
      <a
        href={`/centres/${centreSlug}/ressources/${ressource.id}/reserver`}
        onClick={onReserveClick}
        aria-label={`Réserver ${ressource.nom}`}
        className="inline-flex items-center justify-center"
        style={{
          background: 'var(--gj-teal-deep)',
          color: 'var(--gj-surface)',
          padding: '9px 14px',
          borderRadius: 9,
          fontWeight: 800,
          fontSize: 12,
          textDecoration: 'none',
          minHeight: 44,
          flexShrink: 0,
        }}
      >
        Réserver
      </a>
    </article>
  )
}
