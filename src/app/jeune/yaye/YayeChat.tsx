'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeBubble } from '@/components/ui/Yaye/YayeBubble'
import { QuickReplies, type QuickReply } from '@/components/ui/Yaye/QuickReplies'
import { YayeTypingIndicator } from '@/components/ui/Yaye/YayeTypingIndicator'
import { YayeSkeletonCards } from '@/components/ui/Yaye/YayeSkeletonCards'
import { Icon } from '@/components/ui/Icon'
import { YayeBlocks } from '@/components/yaye/YayeBlocks'
import { YayeFeedback } from '@/components/yaye/YayeFeedback'
import { YayeStreamingText } from '@/components/yaye/YayeStreamingText'
import { pickGreeting, pickSuggestions } from '@/lib/ia/greetings'
import { toolStatus } from '@/lib/ia/tool-labels'
import { streamYaye } from '@/lib/ia/yaye-client'

/** Message affiché dans la conversation. `text` est un ReactNode → permet d'y rendre
 *  des blocs riches (texte + cards opportunités cliquables + actions), via YayeBlocks. */
export type YayeMessage = { id: string; kind: 'bubble'; from: 'bot' | 'user'; text: ReactNode; timestamp?: string }

/** Message d'intro varié. `rng` injectable : init SSR déterministe, re-tirage au montage. */
function buildIntroMessage(prenom?: string, rng?: () => number): YayeMessage {
  return { id: 'm1', kind: 'bubble', from: 'bot', text: pickGreeting(prenom, rng), timestamp: '09:41' }
}

/** Garde les N derniers échanges envoyés à l'agent comme contexte. */
const HISTORY_MAX = 10

export function YayeChat({ prenom }: { prenom?: string } = {}) {
  // Init déterministe (variante 0) pour éviter tout écart d'hydratation SSR↔client.
  const [messages, setMessages] = useState<YayeMessage[]>(() => [buildIntroMessage(prenom, () => 0)])
  const [replies, setReplies] = useState<QuickReply[]>(() => pickSuggestions(() => 0))
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  // État de réflexion contextuel : libellé de l'outil en cours + skeleton si recherche.
  const [status, setStatus] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
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
      setStatus(null)
      setSearching(false)

      const history = historyRef.current.slice(-HISTORY_MAX)
      historyRef.current.push({ role: 'user', content: trimmed })

      // Bulle de streaming : on accumule les tokens et on l'affiche dès le premier,
      // rendue par YayeStreamingText (machine à écrire + curseur).
      const streamId = nextId()
      let acc = ''
      let shown = false
      const renderStream = () => {
        const node = <YayeStreamingText text={acc} />
        if (!shown) {
          shown = true
          setIsTyping(false) // les tokens remplacent l'indicateur de réflexion
          setMessages(prev => [...prev, { id: streamId, kind: 'bubble', from: 'bot', text: node, timestamp: formatTime() }])
        } else {
          setMessages(prev => prev.map(m => (m.id === streamId ? { ...m, text: node } : m)))
        }
      }

      await streamYaye(
        { message: trimmed, sessionId: sessionIdRef.current, history },
        {
          onTool: name => { const s = toolStatus(name); setStatus(s.label); setSearching(!!s.searching) },
          onToken: t => { acc += t; renderStream() },
          onDone: ({ reply, blocks, sessionId }) => {
            if (sessionId) sessionIdRef.current = sessionId
            historyRef.current.push({ role: 'assistant', content: reply })
            const sid = sessionIdRef.current
            const tourIndex = botTurnRef.current
            botTurnRef.current += 1
            setIsTyping(false)
            const node = (
              <div className="flex flex-col gap-space-2">
                <YayeBlocks blocks={blocks} onQuickReply={handleQuickReply} />
                {sid && <YayeFeedback sessionId={sid} tourIndex={tourIndex} />}
              </div>
            )
            // Remplace la bulle de streaming par le rendu final (cards + feedback),
            // ou pousse une nouvelle bulle si aucun token n'a été streamé (fallback JSON).
            if (shown) setMessages(prev => prev.map(m => (m.id === streamId ? { ...m, text: node } : m)))
            else pushBot(node)
          },
          onError: () => {
            setIsTyping(false)
            if (!shown) pushBot('Connexion interrompue. Réessaie dans un instant.')
          },
        },
      )
    },
    [formatTime, pushBot, handleQuickReply],
  )
  sendRef.current = sendMessage

  // Auto-scroll quand la liste change.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isTyping])

  // Au montage (côté client → pas de mismatch d'hydratation), on varie la
  // salutation ET les amorces si la conversation n'a pas encore commencé.
  useEffect(() => {
    setMessages(prev => (prev.length <= 1 ? [buildIntroMessage(prenom)] : prev))
    setReplies(pickSuggestions())
  }, [prenom])

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
          <div className="flex flex-col gap-space-2 self-start w-full">
            <YayeTypingIndicator label={status ?? undefined} />
            {searching && <YayeSkeletonCards />}
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
          <QuickReplies replies={replies} onSelect={sendMessage} />
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-space-3 py-space-2"
          aria-label="Envoyer un message à Yaye"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pose une question à Yaye"
            aria-label="Message"
            className="flex-1 px-space-3 rounded-gj-pill border-[1.5px] border-gj-line bg-white text-[16px] min-h-[var(--tap-input)] focus:outline-none focus:border-gj-teal-deep focus:ring-[3px] focus:ring-[var(--focus-ring-soft)]"
          />
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
