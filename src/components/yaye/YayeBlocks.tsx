'use client'

import { useRouter } from 'next/navigation'
import { YayeActionCard } from '@/components/ui/Yaye/YayeActionCard'
import type { IconName } from '@/components/ui/Icon'
import { YayeOppCard } from './YayeOppCard'
import type { YayeBlock } from '@/lib/ia/blocks'

/**
 * Rend la réponse normalisée de Yaye (liste de blocs) dans une bulle bot :
 * - `text`         → texte simple
 * - `opportunites` → cards cliquables (`YayeOppCard`)
 * - `action`       → carte « Yaye a agi pour toi » + boutons (soumission)
 */
export function YayeBlocks({ blocks, onNavigate }: { blocks: YayeBlock[]; onNavigate?: () => void }) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-space-2">
      {blocks.map((b, i) => {
        if (b.kind === 'text') {
          return b.text ? <span key={i}>{b.text}</span> : null
        }
        if (b.kind === 'opportunites') {
          return (
            <div key={i} className="flex flex-col gap-space-2">
              {b.items.map(o => (
                <YayeOppCard key={o.id} opp={o} onNavigate={onNavigate} />
              ))}
            </div>
          )
        }
        // b.kind === 'action'
        return (
          <YayeActionCard
            key={i}
            title={b.title}
            subtitle={b.subtitle}
            actions={b.actions.map(a => ({ icon: a.icon as IconName, label: a.label }))}
            buttons={b.buttons?.map(bt => ({
              label: bt.label,
              primary: bt.primary,
              onClick: bt.href
                ? () => {
                    onNavigate?.()
                    router.push(bt.href!)
                  }
                : undefined,
            }))}
          />
        )
      })}
    </div>
  )
}
