'use client'

import { Card, Badge, Icon, type IconName } from '@/components/ui'
import { htmlToPlainText } from '@/lib/rich-html'
import type { RessourceListItem, TypeRessourceValue } from '@/lib/loaders/ressources'

interface ResourceCardProps {
  item: RessourceListItem
  /** Indique si la ressource est dans les favoris de l'utilisateur (GUIC-24). */
  isFavori?: boolean
  /** Callback de toggle favori — si non fournie, le bouton bookmark est masqué. */
  onToggleFavori?: (id: string) => void
}

/** Icône + couleur d'accent selon le type de ressource. */
const TYPE_META: Record<
  TypeRessourceValue,
  { icon: IconName; bg: string; text: string; badge: 'red' | 'blue' | 'teal' | 'yellow' | 'green'; cta: string }
> = {
  PDF:   { icon: 'document', bg: 'bg-gj-red-soft',    text: 'text-gj-red-ink',    badge: 'red',    cta: 'Télécharger' },
  Video: { icon: 'play',     bg: 'bg-gj-blue-soft',   text: 'text-gj-blue-ink',   badge: 'blue',   cta: 'Regarder'    },
  Lien:  { icon: 'external', bg: 'bg-gj-teal-soft',   text: 'text-gj-teal-deep',  badge: 'teal',   cta: 'Ouvrir'      },
  Guide: { icon: 'document', bg: 'bg-gj-yellow-soft', text: 'text-gj-yellow-ink', badge: 'yellow', cta: 'Lire'        },
  Outil: { icon: 'bolt',     bg: 'bg-gj-green-soft',  text: 'text-gj-green-ink',  badge: 'green',  cta: 'Utiliser'    },
}

/** Carte ressource (M6 — refonte v2, GUIC-24 favoris). */
export function ResourceCard({ item, isFavori = false, onToggleFavori }: ResourceCardProps) {
  const meta = TYPE_META[item.type]
  const showFavori = typeof onToggleFavori === 'function'
  // GUIC-363 — l'overlay pointe désormais vers la page détail interne
  // (workflow consultation : page détail → bouton "Consulter"). La fiche
  // affiche le CTA cible final ("Télécharger", "Regarder"…) pour conserver
  // la lecture visuelle.
  const detailHref = `/ressources/${item.id}`

  return (
    <Card variant="opportunite" className="relative flex gap-space-3">
      <a
        href={detailHref}
        aria-label={`Voir la ressource : ${item.titre}`}
        className="absolute inset-0 rounded-gj-lg"
      />

      <div
        className={`flex-shrink-0 flex items-center justify-center rounded-gj-md ${meta.bg} ${meta.text} w-[56px] h-[56px]`}
        aria-hidden
      >
        <Icon name={meta.icon} size={26} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-space-1">
        <div className="flex items-start justify-between gap-space-2">
          <h3 className="text-fs-400 font-black text-color-text-primary line-clamp-2">
            {item.titre}
          </h3>
          <div className="flex items-center gap-space-1 shrink-0">
            <Badge variant={meta.badge}>{item.type}</Badge>
            {showFavori && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleFavori!(item.id)
                }}
                aria-pressed={isFavori}
                aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                data-testid="ressource-favori-btn"
                className={`relative z-[1] inline-flex items-center justify-center
                  w-[32px] h-[32px] rounded-full border-[1.5px]
                  transition-all duration-150 ease-out active:scale-90
                  ${isFavori
                    ? 'bg-gj-yellow-soft border-gj-yellow text-gj-yellow-ink scale-105'
                    : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong'}`}
              >
                <Icon name="bookmark" size={14} />
              </button>
            )}
          </div>
        </div>

        <p className="text-fs-200 text-color-text-secondary line-clamp-2">
          {htmlToPlainText(item.description)}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-space-1 mt-space-1">
          <span className="text-fs-200 text-color-text-muted">{item.theme}</span>
          <span className="relative z-[1] text-fs-200 font-bold text-gj-teal-deep inline-flex items-center gap-1">
            {meta.cta}
            <Icon name="arrow-right" size={14} />
          </span>
        </div>
      </div>
    </Card>
  )
}
