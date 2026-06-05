'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeBubble } from '@/components/ui/Yaye/YayeBubble'
import { YayeActionCard } from '@/components/ui/Yaye/YayeActionCard'
import { QuickReplies, type QuickReply } from '@/components/ui/Yaye/QuickReplies'
import { Icon } from '@/components/ui/Icon'

/** Types de messages affichés dans la conversation. */
export type YayeMessage =
  | { id: string; kind: 'bubble'; from: 'bot' | 'user'; text: string; timestamp?: string }
  | {
      id: string
      kind: 'action-card'
      title?: string
      subtitle?: string
      actions: { icon: 'check-circle' | 'document' | 'mail' | 'sparkle'; label: string }[]
    }

/** Liste de messages mock d'entrée. */
const INITIAL_MESSAGES: YayeMessage[] = [
  {
    id: 'm1',
    kind: 'bubble',
    from: 'bot',
    text: "Salama Awa. J'ai analysé 247 offres ce matin — 3 collent à >90% à ton profil. Je te les montre ?",
    timestamp: '09:41',
  },
  {
    id: 'm2',
    kind: 'bubble',
    from: 'user',
    text: 'Oui, montre-moi les meilleures',
    timestamp: '09:42',
  },
  {
    id: 'm3',
    kind: 'action-card',
    title: 'Yaye a agi pour toi',
    subtitle: '3 actions · à valider',
    actions: [
      { icon: 'check-circle', label: 'Filtré 247 → 3 opportunités (match 92%, 91%, 90%)' },
      { icon: 'document', label: 'Pré-rempli ton dossier candidature' },
      { icon: 'mail', label: 'Préparé un brouillon d’email pour le recruteur' },
    ],
  },
]

const INITIAL_REPLIES: QuickReply[] = [
  { label: 'Voir les 3 opportunités', value: 'Voir les 3 opportunités' },
  { label: 'Affiner par localisation', value: 'Affiner par localisation' },
  { label: 'Trouve plutôt une formation', value: 'Trouve plutôt une formation' },
  { label: 'Préparer ma candidature', value: 'Préparer ma candidature' },
]

const BOT_DELAY_MS = 800

function botReplyFor(input: string): string {
  const t = input.toLowerCase()
  if (t.includes('formation')) {
    return "Bien noté — je cherche des formations courtes finançables près de chez toi. 2 secondes…"
  }
  if (t.includes('localis') || t.includes('près')) {
    return "Tu es à Tambacounda. Je restreins le rayon à 50 km. OK ?"
  }
  if (t.includes('candidature') || t.includes('dossier')) {
    return "Ton dossier est prêt à 80%. Il manque ta lettre de motivation. On la rédige ensemble ?"
  }
  return "Reçu. Je traite ta demande et je reviens vers toi avec une proposition concrète."
}

export function YayeChat() {
  const [messages, setMessages] = useState<YayeMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const listEndRef = useRef<HTMLDivElement | null>(null)
  const idCounter = useRef(0)

  const nextId = () => {
    idCounter.current += 1
    return `mlocal-${idCounter.current}`
  }

  const formatTime = useCallback(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const userMsg: YayeMessage = {
        id: nextId(),
        kind: 'bubble',
        from: 'user',
        text: trimmed,
        timestamp: formatTime(),
      }
      setMessages(prev => [...prev, userMsg])
      setInput('')
      setIsTyping(true)
      const reply = botReplyFor(trimmed)
      setTimeout(() => {
        const botMsg: YayeMessage = {
          id: nextId(),
          kind: 'bubble',
          from: 'bot',
          text: reply,
          timestamp: formatTime(),
        }
        setMessages(prev => [...prev, botMsg])
        setIsTyping(false)
      }, BOT_DELAY_MS)
    },
    [formatTime],
  )

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
        {messages.map(m =>
          m.kind === 'bubble' ? (
            <YayeBubble key={m.id} from={m.from} timestamp={m.timestamp}>
              {m.text}
            </YayeBubble>
          ) : (
            <YayeActionCard
              key={m.id}
              title={m.title}
              subtitle={m.subtitle}
              actions={m.actions}
            />
          ),
        )}
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
