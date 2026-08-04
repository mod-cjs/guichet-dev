'use client'

import { useRouter } from 'next/navigation'
import { YayeActionCard } from '@/components/ui/Yaye/YayeActionCard'
import { QuickReplies } from '@/components/ui/Yaye/QuickReplies'
import { Icon, type IconName } from '@/components/ui/Icon'
import { CJSCardFlip } from '@/components/centres/CJSCardFlip'
import { YayeOppCard } from './YayeOppCard'
import { YayeEventCard } from './YayeEventCard'
import { YayeResourceCard } from './YayeResourceCard'
import { YayeCentreCard } from './YayeCentreCard'
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
        if (b.kind === 'evenements') {
          return (
            <div key={i} className="flex flex-col gap-space-2">
              {b.items.map((ev, j) => (
                <div key={ev.id} style={{ animation: `yaye-card-in .32s ease-out ${j * 0.07}s both` }}>
                  <YayeEventCard ev={ev} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )
        }
        if (b.kind === 'ressources') {
          return (
            <div key={i} className="flex flex-col gap-space-2">
              {b.items.map((res, j) => (
                <div key={res.id} style={{ animation: `yaye-card-in .32s ease-out ${j * 0.07}s both` }}>
                  <YayeResourceCard res={res} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )
        }
        if (b.kind === 'centres') {
          return (
            <div key={i} className="flex flex-col gap-space-2">
              {b.items.map((centre, j) => (
                <div key={centre.id} style={{ animation: `yaye-card-in .32s ease-out ${j * 0.07}s both` }}>
                  <YayeCentreCard centre={centre} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )
        }
        if (b.kind === 'notifications') {
          return (
            <div key={i} className="flex flex-col gap-space-2">
              {b.items.map((n) => {
                const row = (
                  <div className={`flex items-start gap-space-2 rounded-gj-md border-[1.5px] p-space-2 ${n.lu ? 'border-gj-line bg-gj-surface' : 'border-gj-teal-deep/30 bg-gj-teal-soft'}`}>
                    {!n.lu && <span aria-hidden className="w-2 h-2 rounded-full bg-gj-teal-deep mt-[6px] shrink-0" />}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-fs-200 text-gj-ink leading-snug">{n.titre}</span>
                      <span className="text-fs-100 text-gj-grey leading-snug">{n.contenu}</span>
                    </div>
                    {n.metaPill && <span className="text-fs-100 font-bold text-gj-teal-deep shrink-0">{n.metaPill}</span>}
                  </div>
                )
                return n.lien ? (
                  <button key={n.id} type="button" onClick={() => { onNavigate?.(); router.push(n.lien!) }} className="text-left">{row}</button>
                ) : (
                  <div key={n.id}>{row}</div>
                )
              })}
            </div>
          )
        }
        if (b.kind === 'carte_cjs') {
          // Carte membre CJS inline (recto/verso + QR) — design v4 `yaye-cjscard.jsx`.
          return (
            <div key={i} style={{ animation: 'yaye-card-in .32s ease-out both' }}>
              <CJSCardFlip user={b.user} cjsUid={b.cjsUid} qrToken={b.qrToken ?? null} maxWidth={340} />
            </div>
          )
        }
        if (b.kind === 'escalade') {
          return <EscaladeCard key={i} block={b} onNavigate={onNavigate} />
        }
        if (b.kind === 'sources') {
          // Ligne de provenance honnête, discrète, sous la réponse (règle v5 —
          // « aucune réponse sans ligne de sources »). Design v5 `yaye-web.jsx:58`.
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-fs-100 text-gj-grey"
            >
              <Icon name="document" size={11} aria-hidden />
              {b.label}
            </span>
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
