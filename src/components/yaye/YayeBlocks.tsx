'use client'

import { useRouter } from 'next/navigation'
import { YayeActionCard } from '@/components/ui/Yaye/YayeActionCard'
import { QuickReplies } from '@/components/ui/Yaye/QuickReplies'
import { Icon, type IconName } from '@/components/ui/Icon'
import { YayeOppCard } from './YayeOppCard'
import { YayeText } from './YayeText'
import type { YayeBlock, YayeEscaladeBlock } from '@/lib/ia/blocks'

/** Accusé de réception d'escalade : transmis · référence · attente honnête. */
function EscaladeCard({ block, onNavigate }: { block: YayeEscaladeBlock; onNavigate?: () => void }) {
  const router = useRouter()
  return (
    <div
      role="status"
      className="flex flex-col gap-space-2 rounded-gj-md border-[1.5px] border-gj-teal-deep/30 p-space-3 bg-gj-teal-soft"
    >
      <div className="flex items-center gap-space-2 text-gj-teal-deep">
        <Icon name="check-circle" size={18} />
        <span className="text-fs-300 font-black">{block.title}</span>
      </div>
      <p className="text-fs-200 text-color-text-secondary leading-snug">{block.message}</p>
      <span className="self-start text-fs-100 font-bold text-gj-teal-deep bg-white border border-gj-line rounded-gj-pill px-space-2 py-[2px]" style={{ fontFamily: 'monospace' }}>
        Référence : {block.reference}
      </span>
      {block.button && (
        <button
          type="button"
          onClick={() => { onNavigate?.(); router.push(block.button!.href) }}
          className="self-start inline-flex items-center gap-space-1 text-fs-200 font-bold text-gj-teal-deep hover:underline"
        >
          {block.button.label}
          <Icon name="arrow-right" size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}

/**
 * Rend la réponse normalisée de Yaye (liste de blocs) dans une bulle bot :
 * - `text`          → texte avec mise en forme légère (gras + puces) via `YayeText`
 * - `opportunites`  → cards cliquables (`YayeOppCard`)
 * - `quick_replies` → boutons de suivi tappables (renvoient un message)
 * - `action`        → carte « Yaye a agi pour toi » + boutons (soumission)
 */
export function YayeBlocks({
  blocks,
  onNavigate,
  onQuickReply,
}: {
  blocks: YayeBlock[]
  onNavigate?: () => void
  onQuickReply?: (value: string) => void
}) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-space-2">
      {/* Apparition en fondu décalé des cards (#réponse interactive). */}
      <style>{`@keyframes yaye-card-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {blocks.map((b, i) => {
        if (b.kind === 'text') {
          return b.text ? <YayeText key={i} text={b.text} /> : null
        }
        if (b.kind === 'quick_replies') {
          return onQuickReply ? (
            <QuickReplies key={i} replies={b.replies} onSelect={onQuickReply} />
          ) : null
        }
        if (b.kind === 'opportunites') {
          return (
            <div key={i} className="flex flex-col gap-space-2">
              {b.items.map((o, j) => (
                <div
                  key={o.id}
                  style={{ animation: `yaye-card-in .32s ease-out ${j * 0.07}s both` }}
                >
                  <YayeOppCard opp={o} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )
        }
        if (b.kind === 'escalade') {
          return <EscaladeCard key={i} block={b} onNavigate={onNavigate} />
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
