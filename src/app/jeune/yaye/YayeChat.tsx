'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeBubble } from '@/components/ui/Yaye/YayeBubble'
import { QuickReplies, type QuickReply } from '@/components/ui/Yaye/QuickReplies'
import { Icon } from '@/components/ui/Icon'
import { YayeBlocks } from '@/components/yaye/YayeBlocks'
import { YayeFeedback } from '@/components/yaye/YayeFeedback'
import type { YayeBlock } from '@/lib/ia/blocks'

/** Message affiché dans la conversation. `text` est un ReactNode → permet d'y rendre
 *  des blocs riches (texte + cards opportunités cliquables + actions), via YayeBlocks. */
export type YayeMessage = { id: string; kind: 'bubble'; from: 'bot' | 'user'; text: ReactNode; timestamp?: string }

const INITIAL_MESSAGES: YayeMessage[] = [
  {
    id: 'm1',
    kind: 'bubble',
    from: 'bot',
    text: "Salama 👋 Je suis Yaye. Dis-moi ce que tu cherches — une opportunité, une formation, ou bien où en sont tes candidatures.",
    timestamp: '09:41',
  },
]

const INITIAL_REPLIES: QuickReply[] = [
  { label: 'Une offre pour moi', value: 'Trouve-moi une opportunité adaptée à mon profil' },
  { label: 'Une formation', value: 'Je cherche une formation près de chez moi' },
  { label: 'Mes candidatures', value: 'Où en sont mes candidatures ?' },
]

/** Garde les N derniers échanges envoyés à l'agent comme contexte. */
const HISTORY_MAX = 10

export function YayeChat() {
  const [messages, setMessages] = useState<YayeMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const listEndRef = useRef<HTMLDivElement | null>(null)
  const idCounter = useRef(0)
  // Persistance conversation côté agent : id de session + historique envoyé en contexte.
  const sessionIdRef = useRef<string | undefined>(undefined)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  // Index de tour côté agent (aligné sur l'ordre des message_recu) pour le feedback.
  const botTurnRef = useRef(0)
  // Handler stable pour les quick replies (évite la dépendance circulaire de `sendMessage`).
  const sendRef = useRef<(t: string) => void>(() => {})
  const handleQuickReply = useCallback((value: string) => sendRef.current(value), [])

  const nextId = () => {
    idCounter.current += 1
    return `mlocal-${idCounter.current}`
  }

  const formatTime = useCallback(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [])

  const pushBot = useCallback(
    (text: ReactNode) => {
      setMessages(prev => [...prev, { id: nextId(), kind: 'bubble', from: 'bot', text, timestamp: formatTime() }])
    },
    [formatTime],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setMessages(prev => [
        ...prev,
        { id: nextId(), kind: 'bubble', from: 'user', text: trimmed, timestamp: formatTime() },
      ])
      setInput('')
      setIsTyping(true)

      const history = historyRef.current.slice(-HISTORY_MAX)
      historyRef.current.push({ role: 'user', content: trimmed })

      try {
        const res = await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, sessionId: sessionIdRef.current, history }),
        })
        const json = await res.json()
        const reply: string =
          json?.data?.reply ?? json?.error?.message ?? "Je n'ai pas pu répondre pour le moment."
        const blocks: YayeBlock[] = json?.data?.blocks ?? [{ kind: 'text', text: reply }]
        if (json?.data?.sessionId) sessionIdRef.current = json.data.sessionId
        historyRef.current.push({ role: 'assistant', content: reply })
        const sid = sessionIdRef.current
        const tourIndex = botTurnRef.current
        botTurnRef.current += 1
        pushBot(
          <div className="flex flex-col gap-space-2">
            <YayeBlocks blocks={blocks} onQuickReply={handleQuickReply} />
            {sid && <YayeFeedback sessionId={sid} tourIndex={tourIndex} />}
          </div>,
        )
      } catch {
        pushBot('Connexion interrompue. Réessaie dans un instant.')
      } finally {
        setIsTyping(false)
      }
    },
    [formatTime, pushBot, handleQuickReply],
  )
  sendRef.current = sendMessage

  // Auto-scroll quand la liste change.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isTyping])

  const quickReplies = useMemo<QuickReply[]>(() => INITIAL_REPLIES, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div
      className="flex flex-col bg-gj-bg"
      style={{ minHeight: '100dvh' }}
    >
      {/* Header sticky top */}
      <header
        className="sticky top-0 bg-white border-b border-gj-line flex items-center gap-2 px-3 h-14 flex-shrink-0"
        style={{ zIndex: 'var(--gj-z-nav)', paddingTop: 'var(--safe-top)' }}
      >
        <Link
          href="/jeune/tableau-de-bord"
          aria-label="Retour"
          className="inline-flex items-center justify-center no-underline rounded-gj-pill"
          style={{ width: 36, height: 36, color: 'var(--gj-ink)' }}
        >
          <Icon name="chevron-left" size={22} />
        </Link>
        <YayeAvatar size={32} withBadge />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-fs-300 font-black text-color-text-primary truncate">Yaye</span>
          <span className="text-fs-100 text-gj-teal-deep font-bold">En ligne</span>
        </div>
      </header>

      {/* Zone messages scrollable */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation Yaye"
        className="flex-1 overflow-y-auto px-space-3 py-space-3 flex flex-col gap-space-3"
      >
        {messages.map(m => (
          <YayeBubble key={m.id} from={m.from} timestamp={m.timestamp}>
            {m.text}
          </YayeBubble>
        ))}
        {isTyping && (
          <div
            data-testid="yaye-typing"
            aria-label="Yaye est en train d'écrire"
            className="inline-flex items-center gap-1 px-space-3 py-space-2 bg-white border border-gj-line text-gj-grey self-start"
            style={{ borderRadius: '12px 12px 12px 4px' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gj-grey animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-gj-grey animate-pulse" style={{ animationDelay: '120ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gj-grey animate-pulse" style={{ animationDelay: '240ms' }} />
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      {/* Quick replies + input bar */}
      <div
        className="sticky bottom-0 bg-white border-t border-gj-line flex-shrink-0"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="px-space-3 pt-space-2">
          <QuickReplies replies={quickReplies} onSelect={sendMessage} />
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-space-3 py-space-2"
          aria-label="Envoyer un message à Yaye"
        >
          <button
            type="button"
            aria-label="Joindre un fichier"
            className="inline-flex items-center justify-center bg-transparent border-0 cursor-pointer text-gj-grey hover:text-gj-ink"
            style={{ width: 36, height: 36 }}
          >
            <Icon name="attach" size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pose une question à Yaye"
            aria-label="Message"
            className="flex-1 px-space-3 rounded-gj-pill border-[1.5px] border-gj-line bg-white text-[16px] min-h-[var(--tap-input)] focus:outline-none focus:border-gj-teal-deep focus:ring-[3px] focus:ring-[var(--focus-ring-soft)]"
          />
          <button
            type="button"
            aria-label="Dicter au micro"
            className="inline-flex items-center justify-center bg-transparent border-0 cursor-pointer text-gj-grey hover:text-gj-ink"
            style={{ width: 36, height: 36 }}
          >
            <Icon name="mic" size={20} />
          </button>
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={input.trim().length === 0}
            className="inline-flex items-center justify-center bg-gj-teal-deep text-white rounded-gj-pill border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ width: 40, height: 40 }}
          >
            <Icon name="arrow-up" size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
