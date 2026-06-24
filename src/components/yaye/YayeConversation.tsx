'use client'

import { useCallback, useRef, useState } from 'react'
import { YayeSidePanel, type YayeSidePanelMessage } from '@/components/ui/Yaye/YayeSidePanel'
import type { QuickReply } from '@/components/ui/Yaye/QuickReplies'
import { YayeBlocks } from './YayeBlocks'
import type { YayeBlock } from '@/lib/ia/blocks'

const HISTORY_MAX = 10
let counter = 0
const nid = () => `yc-${++counter}`

function buildIntro(prenom?: string): YayeSidePanelMessage {
  const salutation = prenom?.trim() ? `Salama ${prenom.trim()} 👋` : 'Salama 👋'
  return {
    id: 'intro',
    from: 'bot',
    text: `${salutation} Je suis Yaye. Dis-moi ce que tu cherches — une opportunité, une formation, ou bien où en sont tes candidatures.`,
  }
}

const SUGGESTIONS: QuickReply[] = [
  { label: 'Une offre pour moi', value: 'Trouve-moi une opportunité adaptée à mon profil' },
  { label: 'Mes candidatures', value: 'Où en sont mes candidatures ?' },
  { label: 'Une formation', value: 'Je cherche une formation près de chez moi' },
]

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
  const [messages, setMessages] = useState<YayeSidePanelMessage[]>(() => [buildIntro(prenom)])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const sessionIdRef = useRef<string | undefined>(undefined)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

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
        setMessages(prev => [
          ...prev,
          { id: nid(), from: 'bot', text: <YayeBlocks blocks={blocks} onNavigate={onClose} onQuickReply={handleQuickReply} /> },
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
      quickReplies={messages.length <= 1 ? SUGGESTIONS : []}
      onQuickReply={send}
      composerValue={input}
      onComposerChange={setInput}
      onSend={send}
      sending={sending}
    />
  )
}
