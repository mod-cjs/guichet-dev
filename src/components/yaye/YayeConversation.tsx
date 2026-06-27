'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { YayeSidePanel, type YayeSidePanelMessage } from '@/components/ui/Yaye/YayeSidePanel'
import type { QuickReply } from '@/components/ui/Yaye/QuickReplies'
import { pickGreeting, pickSuggestions } from '@/lib/ia/greetings'
import { toolStatus } from '@/lib/ia/tool-labels'
import { streamYaye } from '@/lib/ia/yaye-client'
import { YayeBlocks } from './YayeBlocks'
import { YayeFeedback } from './YayeFeedback'
import { YayeStreamingText } from './YayeStreamingText'

const HISTORY_MAX = 10
let counter = 0
const nid = () => `yc-${++counter}`

/** Greeting d'intro. `rng` injectable : init SSR déterministe (variante 0), re-tirage aléatoire à l'ouverture. */
function buildIntro(prenom?: string, rng?: () => number): YayeSidePanelMessage {
  return { id: 'intro', from: 'bot', text: pickGreeting(prenom, rng) }
}

/**
 * Conteneur de conversation Yaye : gère l'état (messages, session, historique),
 * appelle POST /api/ia, et rend le drawer `YayeSidePanel`. Monté par `YayeBubble`
 * (bouton flottant). Les réponses en blocs sont rendues via `YayeBlocks`
 * (texte + cards opportunités cliquables + actions de soumission).
 */
export function YayeConversation({
  open,
  onClose,
  prenom,
}: {
  open: boolean
  onClose: () => void
  prenom?: string
}) {
  // Init déterministe (variante 0) pour éviter tout écart d'hydratation SSR↔client.
  const [messages, setMessages] = useState<YayeSidePanelMessage[]>(() => [buildIntro(prenom, () => 0)])
  const [suggestions, setSuggestions] = useState<QuickReply[]>(() => pickSuggestions(() => 0))
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // `thinking` = indicateur de réflexion AVANT le premier token ; passe à false dès
  // que le texte commence à s'écrire. `status`/`searching` = réflexion contextuelle.
  const [thinking, setThinking] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const sessionIdRef = useRef<string | undefined>(undefined)
  // Index de tour bot (aligné sur l'ordre des message_recu) pour le feedback 👍/👎.
  const botTurnRef = useRef(0)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // À chaque ouverture du drawer, si la conversation n'a pas commencé, on varie
  // la salutation ET les amorces (côté client → pas de mismatch d'hydratation).
  useEffect(() => {
    if (open && messagesRef.current.length <= 1) {
      setMessages([buildIntro(prenom)])
      setSuggestions(pickSuggestions())
    }
  }, [open, prenom])

  // Handler stable pour les quick replies (évite la dépendance circulaire de `send` sur lui-même).
  const sendRef = useRef<(t: string) => void>(() => {})
  const handleQuickReply = useCallback((value: string) => sendRef.current(value), [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return
      setMessages(prev => [...prev, { id: nid(), from: 'user', text: trimmed }])
      setInput('')
      setSending(true)
      setThinking(true)
      setStatus(null)
      setSearching(false)

      const history = historyRef.current.slice(-HISTORY_MAX)
      historyRef.current.push({ role: 'user', content: trimmed })

      // Plancher de réflexion : pause « humaine » proportionnelle à la complexité.
      const sentAt = Date.now()
      const floorMs = Math.min(1200, 350 + trimmed.length * 8)

      // Bulle de streaming, rendue en machine à écrire (curseur + cadence lissée).
      const streamId = nid()
      let acc = ''
      let started = false
      let bubbleShown = false
      let revealTimer: ReturnType<typeof setTimeout> | undefined
      const showBubble = () => {
        bubbleShown = true
        setThinking(false)
        setMessages(prev => [...prev, { id: streamId, from: 'bot', text: <YayeStreamingText text={acc} /> }])
      }
      const renderStream = () => {
        if (!started) {
          started = true
          revealTimer = setTimeout(showBubble, Math.max(0, sentAt + floorMs - Date.now()))
        } else if (bubbleShown) {
          setMessages(prev => prev.map(m => (m.id === streamId ? { ...m, text: <YayeStreamingText text={acc} /> } : m)))
        }
      }

      await streamYaye(
        { message: trimmed, sessionId: sessionIdRef.current, history },
        {
          onTool: name => { const s = toolStatus(name); setStatus(s.label); setSearching(!!s.searching) },
          onToken: t => { acc += t; renderStream() },
          onDone: ({ reply, blocks, sessionId }) => {
            if (revealTimer) clearTimeout(revealTimer)
            if (sessionId) sessionIdRef.current = sessionId
            historyRef.current.push({ role: 'assistant', content: reply })
            const sid = sessionIdRef.current
            const tourIndex = botTurnRef.current
            botTurnRef.current += 1
            const node = (
              <div className="flex flex-col gap-space-2">
                <YayeBlocks blocks={blocks} onNavigate={onClose} onQuickReply={handleQuickReply} />
                {sid && <YayeFeedback sessionId={sid} tourIndex={tourIndex} />}
              </div>
            )
            if (bubbleShown) setMessages(prev => prev.map(m => (m.id === streamId ? { ...m, text: node } : m)))
            else setMessages(prev => [...prev, { id: nid(), from: 'bot', text: node }])
          },
          onError: msg => {
            if (revealTimer) clearTimeout(revealTimer)
            setMessages(prev => [
              ...prev,
              { id: nid(), from: 'bot', text: msg ?? "Oups, j'ai eu un souci de mon côté. Réessaie dans un instant, je reste avec toi." },
            ])
          },
        },
      )
      setThinking(false)
      setSending(false)
    },
    [sending, onClose, handleQuickReply],
  )
  sendRef.current = send

  return (
    <YayeSidePanel
      open={open}
      onClose={onClose}
      messages={messages}
      quickReplies={messages.length <= 1 ? suggestions : []}
      onQuickReply={send}
      composerValue={input}
      onComposerChange={setInput}
      onSend={send}
      sending={sending}
      typing={thinking}
      thinkingLabel={status ?? undefined}
      thinkingSearching={searching}
    />
  )
}
