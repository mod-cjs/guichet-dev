'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeBubble } from '@/components/ui/Yaye/YayeBubble'
import { QuickReplies, type QuickReply } from '@/components/ui/Yaye/QuickReplies'

export interface YayeSidePanelMessage {
  id: string
  from: 'bot' | 'user'
  text: ReactNode
}

export interface YayeSidePanelProps {
  /** Visibilité du panel (controlled). */
  open: boolean
  /** Callback fermeture (Esc / backdrop / bouton croix). */
  onClose: () => void
  /** Messages de conversation. Si absent, un mock par défaut est utilisé. */
  messages?: YayeSidePanelMessage[]
  /** Réponses rapides affichées sous le dernier message bot. */
  quickReplies?: QuickReply[]
  /** Callback sur sélection d'une quick reply. */
  onQuickReply?: (value: string) => void
  /** Etiquette de section (date/horaire) affichée en haut. */
  dateLabel?: string
  /**
   * Prénom de l'utilisateur connecté pour personnaliser le greeting.
   * Si absent ou vide, un greeting générique sans nom est utilisé.
   */
  prenom?: string
  /** Valeur contrôlée du composer. Fournie avec `onSend` → composer réel. */
  composerValue?: string
  /** Callback de saisie du composer (composer contrôlé). */
  onComposerChange?: (value: string) => void
  /** Callback d'envoi. Si fourni, le composer est réel (branché sur `/api/ia`) ; sinon mock non contrôlé. */
  onSend?: (value: string) => void
  /** Vrai pendant l'envoi : désactive le composer et le bouton. */
  sending?: boolean
}

/**
 * Génère les messages par défaut en personnalisant le greeting avec le prénom.
 * Si prenom est absent ou vide, le greeting est générique (pas de nom codé en dur).
 */
function buildDefaultMessages(prenom?: string): YayeSidePanelMessage[] {
  const salutation = prenom?.trim()
    ? `Salama ${prenom.trim()}.`
    : 'Salama !'
  return [
    {
      id: 'm1',
      from: 'bot',
      text: `${salutation} J'ai trouvé des opportunités pour toi à Tambacounda, en agri et projet.`,
    },
    {
      id: 'm2',
      from: 'user',
      text: 'Trouve-moi un stage en agro, près de chez moi, payé.',
    },
    {
      id: 'm3',
      from: 'bot',
      text: "Reçu. J'ai trouvé celles qui collent vraiment à ton profil. Je te montre ?",
    },
  ]
}

const DEFAULT_REPLIES: QuickReply[] = [
  { label: 'Voir les 2 offres', value: 'voir-offres' },
  { label: 'Élargis à Kédougou aussi', value: 'elargir-kedougou' },
  { label: 'Postule pour moi', value: 'postule' },
]

/**
 * YayeSidePanel — drawer 400px ancré à droite, ouvert via prop `open`.
 *
 * Conforme `design-guichet-v2/web-dashboard.jsx#WebDashYayePanel` :
 * - Header teal-deep avec avatar Y, badge IA, indicateur "en ligne"
 * - Body scrollable, fond `--gj-bg-soft`, messages alignés
 * - Footer composer (attache + champ + bouton envoi rond teal)
 * - Backdrop semi-transparent fermant au clic
 * - Esc ferme · focus trap basique (focus initial sur le bouton fermer)
 * - role="dialog" + aria-modal="true" + aria-label="Conversation avec Yaye"
 *
 * Non routé : ouvert depuis BenefTopBar (état lifted côté parent client).
 * Mock data conversation par défaut ; pas d'appel LLM réel ici.
 */
export function YayeSidePanel({
  open,
  onClose,
  messages,
  quickReplies = DEFAULT_REPLIES,
  onQuickReply,
  dateLabel = "Aujourd'hui · 9:41",
  prenom,
  composerValue,
  onComposerChange,
  onSend,
  sending = false,
}: YayeSidePanelProps) {
  const resolvedMessages = messages ?? buildDefaultMessages(prenom)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Esc → close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus initial sur le bouton fermer à l'ouverture
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      data-testid="yaye-side-panel-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer la conversation Yaye"
        onClick={onClose}
        data-testid="yaye-side-panel-backdrop"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 30, 28, .35)',
          border: 0,
          padding: 0,
          margin: 0,
          cursor: 'pointer',
        }}
      />

      <style>{`@keyframes yaye-slide-in{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}
@media(min-width:1280px){.gj-yaye-side-panel{width:480px !important}}`}</style>

      <aside
        ref={panelRef}
        className="gj-yaye-side-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Conversation avec Yaye"
        style={{
          position: 'relative',
          width: 400,
          maxWidth: '100vw',
          background: 'var(--gj-surface)',
          borderLeft: '1.5px solid var(--gj-line)',
          boxShadow: '-10px 0 40px rgba(0,0,0,.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'yaye-slide-in .25s ease',
        }}
      >
        {/* Header */}
        <header
          style={{
            background: 'var(--gj-teal-deep)',
            color: 'var(--gj-surface)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <YayeAvatar size={32} withBadge />
          <div style={{ flex: 1, lineHeight: 1.2 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Yaye</div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.9,
                marginTop: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gj-green, #7BE5B5)',
                }}
              />
              en ligne · agit sur ton compte
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32,
              height: 32,
              border: 0,
              background: 'transparent',
              color: 'var(--gj-surface)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <Icon name="close" size={20} />
          </button>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              background:
                'linear-gradient(90deg, var(--gj-yellow) 0%, var(--gj-yellow) 25%, transparent 25%)',
            }}
          />
        </header>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px 8px',
            background: 'var(--gj-bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              alignSelf: 'center',
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--gj-grey)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              background: 'var(--gj-surface)',
              border: '1px solid var(--gj-line)',
              borderRadius: 999,
              padding: '3px 10px',
              marginBottom: 4,
            }}
          >
            {dateLabel}
          </div>
          {resolvedMessages.map((m) => (
            <YayeBubble key={m.id} from={m.from}>
              {m.text}
            </YayeBubble>
          ))}
          {quickReplies.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <QuickReplies
                replies={quickReplies}
                onSelect={(v) => onQuickReply?.(v)}
              />
            </div>
          )}
        </div>

        {/* Composer — réel si `onSend` fourni, sinon mock non contrôlé. */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const v = (composerValue ?? '').trim()
            if (onSend && v && !sending) onSend(v)
          }}
          style={{
            padding: 12,
            background: 'var(--gj-surface)',
            borderTop: '1px solid var(--gj-line)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label="Joindre un fichier"
            style={{
              width: 38,
              height: 38,
              border: 0,
              background: 'transparent',
              color: 'var(--gj-grey)',
              cursor: 'pointer',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="attach" size={18} />
          </button>
          <input
            type="text"
            placeholder="Demande à Yaye…"
            aria-label="Message à Yaye"
            value={onSend ? (composerValue ?? '') : undefined}
            onChange={onSend ? (e) => onComposerChange?.(e.target.value) : undefined}
            disabled={sending}
            style={{
              flex: 1,
              border: '1.5px solid var(--gj-line)',
              padding: '10px 14px',
              fontSize: 13,
              background: 'var(--gj-bg)',
              borderRadius: 999,
              color: 'var(--gj-ink)',
              outline: 0,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={sending || (onSend ? !(composerValue ?? '').trim() : false)}
            style={{
              background: 'var(--gj-teal-deep)',
              color: 'var(--gj-surface)',
              border: 0,
              borderRadius: '50%',
              width: 40,
              height: 40,
              cursor: sending ? 'default' : 'pointer',
              opacity: sending || (onSend && !(composerValue ?? '').trim()) ? 0.55 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="arrow-up" size={16} />
          </button>
        </form>
      </aside>
    </div>
  )
}
