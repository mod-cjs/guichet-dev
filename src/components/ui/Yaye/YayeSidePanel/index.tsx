'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { YayeTypingIndicator } from '@/components/ui/Yaye/YayeTypingIndicator'
import { YayeSkeletonCards } from '@/components/ui/Yaye/YayeSkeletonCards'
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
  /**
   * Affiche l'indicateur de frappe. Si absent, on retombe sur `sending` (le panel
   * en mock l'utilise). En mode streaming, le parent le passe à `false` dès le
   * premier token pour que les points laissent place au texte qui s'écrit.
   */
  typing?: boolean
  /** Libellé contextuel de réflexion (« Yaye cherche des opportunités »), piloté par les events tool. */
  thinkingLabel?: string
  /** Vrai si l'outil en cours ramène des offres → affiche des skeleton cards. */
  thinkingSearching?: boolean
  /**
   * Texte de la réponse FINALISÉE à annoncer aux lecteurs d'écran (région live
   * dédiée). Le flux token-à-token reste hors région live pour éviter une
   * re-annonce continue (a11y C1).
   */
  announce?: string
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
  dateLabel = "Aujourd'hui",
  prenom,
  composerValue,
  onComposerChange,
  onSend,
  sending = false,
  typing,
  thinkingLabel,
  thinkingSearching = false,
  announce,
}: YayeSidePanelProps) {
  const resolvedMessages = messages ?? buildDefaultMessages(prenom)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  // Esc ferme · Tab piégé dans le dialog (focus trap complet, a11y modale).
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      // `a[href]` (pas `[href]` global, qui matcherait les <use href> des icônes SVG).
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
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

  // Auto-scroll vers le dernier message (parité avec la page fullscreen YayeChat) :
  // nouveau message OU passage en « écrit… » → on garde la fin visible.
  useEffect(() => {
    if (!open) return
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [open, resolvedMessages.length, sending])

  if (!open) return null

  return (
    <div
      data-testid="yaye-side-panel-root"
      style={{
        position: 'fixed',
        inset: 0,
        // Modal (backdrop + aria-modal) → niveau overlay, AU-DESSUS du header
        // (--gj-z-nav:200) et de la bottom-nav (300), sinon le haut du panel est masqué.
        zIndex: 'var(--gj-z-overlay)',
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
            // Le bandeau coloré déborde sous l'encoche (notch) sur mobile.
            paddingTop: 'calc(14px + var(--safe-top, 0px))',
            paddingRight: 16,
            paddingBottom: 14,
            paddingLeft: 16,
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
              Conseillère IA · agit sur ton compte
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

        {/* Annonce SR de la réponse finalisée (le flux token-à-token reste hors région live). */}
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>

        {/* Body. aria-live=off : le streaming muterait la région ~60×/s (a11y C1). */}
        <div
          role="log"
          aria-live="off"
          aria-label="Conversation Yaye"
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
          {(typing ?? sending) && (
            <div className="flex flex-col gap-space-2 self-start w-full">
              <YayeTypingIndicator label={thinkingLabel} />
              {thinkingSearching && <YayeSkeletonCards />}
            </div>
          )}
          <div ref={endRef} />
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
              fontSize: 16, // ≥16px : évite le zoom auto iOS au focus (parité page fullscreen)
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
