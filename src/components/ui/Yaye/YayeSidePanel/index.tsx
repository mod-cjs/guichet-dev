'use client'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeBubble } from '@/components/ui/Yaye/YayeBubble'
import { QuickReplies, type QuickReply } from '@/components/ui/Yaye/QuickReplies'

export interface YayeMessage {
  id: string
  from: 'bot' | 'user'
  text: string
}

export interface YayeSidePanelProps {
  /** Ouverture contrôlée du drawer. */
  isOpen: boolean
  /** Callback fermeture (Esc, clic backdrop, bouton ✕). */
  onClose: () => void
  /** Liste de messages affichés. Si non fourni, mock conversation par défaut. */
  messages?: YayeMessage[]
  /** Réponses rapides proposées sous la conversation. */
  quickReplies?: QuickReply[]
  /** Callback sélection d'une réponse rapide. */
  onQuickReply?: (value: string) => void
  /** Callback envoi message (placeholder input). */
  onSend?: (text: string) => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const DEFAULT_MESSAGES: YayeMessage[] = [
  { id: 'm1', from: 'bot', text: "Salama Awa. J'ai 3 opportunités à 90%+ match pour toi à Tambacounda — toutes en agri / projet." },
  { id: 'm2', from: 'user', text: 'Trouve-moi un stage en agro, près de chez moi, payé.' },
  { id: 'm3', from: 'bot', text: "Reçu. J'ai filtré 247 offres → 2 collent vraiment. Je te montre ?" },
]

const DEFAULT_REPLIES: QuickReply[] = [
  { label: 'Voir les 2 offres', value: 'voir-offres' },
  { label: 'Élargis à Kédougou aussi', value: 'elargir-kedougou' },
  { label: 'Postule pour moi', value: 'postule-pour-moi' },
]

/**
 * YayeSidePanel — drawer latéral droit 400px (desktop) ouvert depuis BenefTopBar.
 *
 * Conforme `design-guichet-v2/web-dashboard.jsx#WebDashYayePanel` :
 * - Header teal-deep + avatar Yaye + badge IA + statut en ligne
 * - Body scrollable bg `#F5FAF8` avec bulles + quick replies
 * - Footer input chat (attach + zone texte + envoi)
 * - Esc + clic backdrop ferment
 * - role="dialog" aria-modal="true"
 * - Focus trap Tab/Shift+Tab, restitution focus à la fermeture
 *
 * Mobile (< md) : bottom-sheet hauteur 88vh.
 */
export function YayeSidePanel({
  isOpen,
  onClose,
  messages = DEFAULT_MESSAGES,
  quickReplies = DEFAULT_REPLIES,
  onQuickReply,
  onSend,
}: YayeSidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [draft, setDraft] = useState('')
  const titleId = useId()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
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
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const id = requestAnimationFrame(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      firstFocusable?.focus()
    })
    const restore = returnFocusRef.current
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(id)
      if (restore && document.body.contains(restore)) {
        try {
          restore.focus()
        } catch {
          /* noop */
        }
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSend?.(text)
    setDraft('')
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--gj-z-overlay)' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'var(--gj-overlay)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[400px]
          bg-white shadow-gj-lg flex flex-col rounded-t-gj-2xl md:rounded-none
          max-h-[88vh] md:max-h-full"
      >
        {/* Header teal-deep */}
        <div
          className="flex items-center gap-space-2 relative flex-shrink-0"
          style={{
            background: 'var(--gj-teal-deep)',
            color: 'var(--gj-surface)',
            padding: '14px 16px',
          }}
        >
          <YayeAvatar size={32} />
          <div style={{ flex: 1, lineHeight: 1.15 }}>
            <div>
              <span
                id={titleId}
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 17,
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #fff, var(--gj-yellow))',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Yaye
              </span>
              <span
                style={{
                  background: 'var(--gj-yellow)',
                  color: 'var(--gj-teal-deep)',
                  fontSize: 9,
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: 999,
                  marginLeft: 6,
                  letterSpacing: '.4px',
                }}
              >
                IA
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.9,
                marginTop: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span
                aria-hidden
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#7BE5B5' }}
              />
              en ligne · agit sur ton compte
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau Yaye"
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
            }}
          >
            <Icon name="close" size={16} />
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
        </div>

        {/* Body conversation */}
        <div
          className="flex-1 overflow-y-auto flex flex-col gap-space-2"
          style={{ background: '#F5FAF8', padding: '14px 14px 8px' }}
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
            Aujourd&apos;hui · 9:41
          </div>
          {messages.map((m) => (
            <YayeBubble key={m.id} from={m.from}>
              {m.text}
            </YayeBubble>
          ))}
          {quickReplies.length > 0 && (
            <div className="mt-space-2">
              <QuickReplies
                replies={quickReplies}
                onSelect={(v) => onQuickReply?.(v)}
              />
            </div>
          )}
        </div>

        {/* Footer input */}
        <form
          className="flex items-center gap-space-2 flex-shrink-0 border-t border-gj-line bg-white"
          style={{ padding: 12 }}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="attach" size={18} />
          </button>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Demande à Yaye…"
            aria-label="Message à Yaye"
            style={{
              flex: 1,
              border: '1.5px solid var(--gj-line)',
              padding: '10px 14px',
              fontSize: 13,
              background: 'var(--gj-bg)',
              borderRadius: 999,
              color: 'var(--gj-ink)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={!draft.trim()}
            style={{
              background: 'var(--gj-teal-deep)',
              color: 'var(--gj-surface)',
              border: 0,
              borderRadius: '50%',
              width: 40,
              height: 40,
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
              opacity: draft.trim() ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="arrow-up" size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
