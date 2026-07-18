'use client'

import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import type { YayeRessourceItem } from '@/lib/ia/blocks'

/** Card d'une ressource numérique (bibliothèque en ligne) → détail /ressources/[id]. */

const RES_ICON: Record<string, IconName> = {
  PDF: 'resources',
  Video: 'video',
  Lien: 'globe',
  Guide: 'learning',
  Outil: 'project',
}
const RES_LABEL: Record<string, string> = {
  PDF: 'PDF', Video: 'Vidéo', Lien: 'Lien', Guide: 'Guide', Outil: 'Outil',
}

export function YayeResourceCard({ res, onNavigate }: { res: YayeRessourceItem; onNavigate?: () => void }) {
  const icon = RES_ICON[res.type] ?? 'resources'
  const label = RES_LABEL[res.type] ?? res.type
  return (
    <article
      data-testid="yaye-resource-card"
      data-type={res.type}
      className="relative bg-gj-surface border-[1.5px] border-gj-line rounded-gj-lg p-space-3 flex items-center gap-space-3"
    >
      <Link href={`/ressources/${res.id}`} onClick={onNavigate} aria-label={`Ouvrir la ressource : ${res.titre}`} className="absolute inset-0" />
      <span aria-hidden className="w-9 h-9 rounded-gj-md bg-gj-teal-soft text-gj-teal-deep inline-flex items-center justify-center shrink-0">
        <Icon name={icon} size={17} />
      </span>
      <div className="flex flex-col gap-[2px] min-w-0 flex-1">
        <span className="text-fs-100 font-black uppercase tracking-wide text-gj-teal-deep">{label} · {res.theme}</span>
        <span className="font-bold text-fs-300 text-gj-ink leading-snug">{res.titre}</span>
      </div>
      <span className="relative z-10 inline-flex items-center gap-1 text-fs-200 font-bold text-gj-teal-deep shrink-0">
        Ouvrir
        <Icon name="arrow-right" size={13} aria-hidden />
      </span>
    </article>
  )
}
