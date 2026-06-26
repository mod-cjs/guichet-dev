'use client'

// Client de l'agent Yaye côté navigateur (#1 SSE streaming).
// Tente le flux SSE (`Accept: text/event-stream`) → progression (tool) + tokens au
// fil de l'eau + `done` final. Retombe sur le JSON classique si le flux est absent
// (rétro-compat / environnements de test sans body stream).

import type { YayeBlock } from './blocks'

export interface YayeRequest {
  message: string
  sessionId?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface YayeDone {
  reply: string
  blocks: YayeBlock[]
  sessionId?: string
  toolsUsed?: string[]
}

export interface YayeStreamHandlers {
  /** Fragment de texte de la réponse finale (streaming). */
  onToken?: (text: string) => void
  /** Un outil démarre (progression : « Yaye cherche… »). */
  onTool?: (name: string) => void
  /** Réponse complète (reply + blocs). Toujours appelé une fois en cas de succès. */
  onDone: (d: YayeDone) => void
  /** Échec réseau/serveur. */
  onError?: () => void
}

const FALLBACK = "Je n'ai pas pu répondre pour le moment."

/** Parse un événement SSE brut (`event: x\ndata: {...}`). */
function parseSseEvent(raw: string): { event: string; data: unknown } | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return null
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return null
  }
}

export async function streamYaye(body: YayeRequest, h: YayeStreamHandlers): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    })
  } catch {
    h.onError?.()
    return
  }

  const ct = res.headers?.get?.('content-type') ?? ''
  if (res.body && ct.includes('text/event-stream')) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? '' // dernier fragment éventuellement incomplet
        for (const part of parts) {
          const ev = parseSseEvent(part)
          if (!ev) continue
          if (ev.event === 'token') h.onToken?.((ev.data as { text: string }).text)
          else if (ev.event === 'tool') h.onTool?.((ev.data as { name: string }).name)
          else if (ev.event === 'done') h.onDone(ev.data as YayeDone)
          else if (ev.event === 'error') h.onError?.()
        }
      }
    } catch {
      h.onError?.()
    }
    return
  }

  // Fallback JSON (rétro-compat).
  const json = (await res.json().catch(() => null)) as
    | { data?: YayeDone; error?: { message?: string } }
    | null
  if (!json) {
    h.onError?.()
    return
  }
  const reply = json.data?.reply ?? json.error?.message ?? FALLBACK
  const blocks = json.data?.blocks ?? [{ kind: 'text', text: reply }]
  h.onDone({ reply, blocks, sessionId: json.data?.sessionId, toolsUsed: json.data?.toolsUsed })
}
