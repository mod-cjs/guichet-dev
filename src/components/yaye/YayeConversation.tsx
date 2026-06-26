'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { YayeSidePanel, type YayeSidePanelMessage } from '@/components/ui/Yaye/YayeSidePanel'
import type { QuickReply } from '@/components/ui/Yaye/QuickReplies'
import { pickGreeting, pickSuggestions } from '@/lib/ia/greetings'
import { YayeBlocks } from './YayeBlocks'
import { YayeFeedback } from './YayeFeedback'
import type { YayeBlock } from '@/lib/ia/blocks'

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

      const history = historyRef.current.slice(-HISTORY_MAX)
      historyRef.current.push({ role: 'user', content: trimmed })

      try {
        const res = await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, sessionId: sessionIdRef.current, history }),
        })
        const json = await res.json()
        const reply: string = json?.data?.reply ?? json?.error?.message ?? "Je n'ai pas pu répondre."
        const blocks: YayeBlock[] = json?.data?.blocks ?? [{ kind: 'text', text: reply }]
        if (json?.data?.sessionId) sessionIdRef.current = json.data.sessionId
        historyRef.current.push({ role: 'assistant', content: reply })
        const sid = sessionIdRef.current
        const tourIndex = botTurnRef.current
        botTurnRef.current += 1
        setMessages(prev => [
          ...prev,
          {
            id: nid(),
            from: 'bot',
            text: (
              <div className="flex flex-col gap-space-2">
                <YayeBlocks blocks={blocks} onNavigate={onClose} onQuickReply={handleQuickReply} />
                {sid && <YayeFeedback sessionId={sid} tourIndex={tourIndex} />}
              </div>
            ),
          },
        ])
      } catch {
        setMessages(prev => [
          ...prev,
          { id: nid(), from: 'bot', text: 'Connexion interrompue. Réessaie dans un instant.' },
        ])
      } finally {
        setSending(false)
      }
    },
    [sending, onClose],
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
    />
  )
}
