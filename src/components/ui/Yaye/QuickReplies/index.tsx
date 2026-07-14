'use client'

import { Icon } from '@/components/ui/Icon'

export interface QuickReply {
  label: string
  value: string
}

export interface QuickRepliesProps {
  replies: QuickReply[]
  onSelect: (value: string) => void
  className?: string
  /** Label ARIA du groupe. Défaut "Réponses suggérées". */
  'aria-label'?: string
}

/**
 * QuickReplies — boutons de réponses rapides proposés par Yaye.
 *
 * - Liste de boutons outlined teal-deep, radius pill
 * - Min-height 40px, alignement left, icône `sparkle` en tête (affordance « suggestion IA », design v4)
 * - Wrap responsive
 * - Callback `onSelect(value)` au clic ou Entrée
 */
export function QuickReplies({
  replies,
  onSelect,
  className = '',
  'aria-label': ariaLabel = 'Réponses suggérées',
}: QuickRepliesProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex flex-col gap-space-1 max-w-[84%] ${className}`}
    >
      {replies.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onSelect(r.value)}
          className="inline-flex items-center gap-space-1 bg-white text-gj-teal-deep
            border-[1.5px] border-gj-teal-deep rounded-gj-pill
            px-space-3 py-space-2 text-fs-300 font-bold text-left
            min-h-[40px] cursor-pointer hover:bg-gj-teal-soft transition-colors"
        >
          <Icon name="sparkle" size={13} className="shrink-0" aria-hidden />
          <span className="flex-1 min-w-0">{r.label}</span>
        </button>
      ))}
    </div>
  )
}
