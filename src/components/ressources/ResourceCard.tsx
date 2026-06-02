'use client'

import { Card, Badge, Icon, type IconName } from '@/components/ui'
import type { RessourceListItem, TypeRessourceValue } from '@/lib/loaders/ressources'

interface ResourceCardProps {
  item: RessourceListItem
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

/** Carte ressource (M6 — refonte v2). */
export function ResourceCard({ item }: ResourceCardProps) {
  const meta = TYPE_META[item.type]
  const isExternal = /^https?:\/\//.test(item.url)

  return (
    <Card variant="opportunite" className="relative flex gap-space-3">
      <a
        href={item.url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        aria-label={`${meta.cta} : ${item.titre}`}
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
          <Badge variant={meta.badge}>{item.type}</Badge>
        </div>

        <p className="text-fs-200 text-color-text-secondary line-clamp-2">
          {item.description}
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
