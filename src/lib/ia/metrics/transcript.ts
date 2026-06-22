// Reconstructeur de transcript Yaye (GUIC-435 — jalon A).
// Assemble une conversation complète par `session_id` à partir de :
//   - `agent_logs` : trace technique événementielle (intentions, outils, durées, statuts).
//   - `MessageWhatsApp` : texte VERBATIM (canal WhatsApp uniquement).
//
// ⚠️ Asymétrie de canal (par conception CDP — voir 06/07) :
//   - WhatsApp : texte brut disponible (`MessageWhatsApp.contenu`) → transcript COMPLET.
//   - Web      : le texte n'est PAS persisté durablement (Redis transitoire 30 min).
//                agent_logs ne stocke que des LONGUEURS → transcript STRUCTUREL seul.
//   `hasVerbatimText` indique lequel des deux on a pu reconstruire.
//
// Ne lit que des modèles EXISTANTS. N'écrit rien. Spec : 14-metriques-...md

import { prisma } from '@/lib/prisma'
import type { AgentLog, CanalAgent } from '@prisma/client'

/** Texte verbatim d'un tour (WhatsApp via MessageWhatsApp, web via YayeTranscriptTurn). */
interface VerbatimTurn {
  userText: string | null
  assistantText: string | null
}

/** Un événement technique normalisé (issu d'agent_logs, sérialisable — pas de BigInt). */
export interface TranscriptEvent {
  type: string
  tsMs: number
  toolCalled: string | null
  statut: string
  dureeMs: number | null
  formatCanal: string | null
  payload: unknown
}

/** Un tour de conversation (un échange user → assistant). */
export interface TranscriptTurn {
  index: number
  /** Texte utilisateur (WhatsApp uniquement ; null côté web). */
  userText: string | null
  /** Longueur du message utilisateur (toujours dispo via agent_logs). */
  userLength: number | null
  /** Texte de la réponse Yaye (WhatsApp uniquement ; null côté web). */
  assistantText: string | null
  /** Outils appelés durant ce tour, dans l'ordre. */
  toolsUsed: string[]
  /** Résumés des données renvoyées par les outils (R1) — pour mesurer la fidélité. */
  toolResults: string[]
  /** Intentions détectées (noms d'outils proposés par le LLM). */
  intentions: string[]
  /** Types de blocs transmis (ex. ['text','opportunites']). */
  blocs: string[]
  /** Nombre de tours d'outils (rounds) effectués par le moteur. */
  rounds: number | null
  /** Latence du tour : du message reçu au contenu transmis (ms). */
  dureeMs: number | null
  /** Le tour s'est-il terminé en escalade conseiller ? */
  escalade: boolean
  /** Le tour a-t-il rencontré une erreur (echec/partiel) ? */
  erreur: boolean
}

export interface ReconstructedTranscript {
  sessionId: string
  canal: CanalAgent | null
  cjsUid: string | null
  centreId: string | null
  /** Vrai si on a le texte verbatim (WhatsApp). Faux = structurel seul (web). */
  hasVerbatimText: boolean
  turns: TranscriptTurn[]
  events: TranscriptEvent[]
  /** Métriques de session dérivées (réutilisées par les rollups). */
  nbTours: number
  dureeMs: number
  escalade: boolean
  debutMs: number | null
  finMs: number | null
}

/** Lit une valeur numérique dans un payload JSON de façon défensive. */
function numFromPayload(payload: unknown, key: string): number | null {
  if (payload && typeof payload === 'object' && key in payload) {
    const v = (payload as Record<string, unknown>)[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

/** Lit une chaîne dans un payload JSON de façon défensive. */
function strFromPayload(payload: unknown, key: string): string | null {
  if (payload && typeof payload === 'object' && key in payload) {
    const v = (payload as Record<string, unknown>)[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

/** Lit un tableau de chaînes dans un payload JSON de façon défensive. */
function strArrayFromPayload(payload: unknown, key: string): string[] {
  if (payload && typeof payload === 'object' && key in payload) {
    const v = (payload as Record<string, unknown>)[key]
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  }
  return []
}

function toEvent(log: AgentLog): TranscriptEvent {
  return {
    type: log.typeEvenement,
    tsMs: Number(log.tsMs),
    toolCalled: log.toolCalled,
    statut: log.statut,
    dureeMs: log.dureeMs,
    formatCanal: log.formatCanal,
    payload: log.payload,
  }
}

/**
 * Découpe la suite d'événements en tours. Un tour démarre sur `message_recu`
 * et se clôt au `message_recu` suivant (ou en fin de session). On agrège dedans
 * les intentions, outils, blocs, l'escalade et l'erreur éventuels.
 */
function buildTurns(events: TranscriptEvent[], verbatim: VerbatimTurn[]): TranscriptTurn[] {
  const turns: TranscriptTurn[] = []
  let current: TranscriptTurn | null = null
  let turnStartMs: number | null = null

  const closeTurn = (endMs: number | null) => {
    if (current) {
      if (turnStartMs != null && endMs != null) current.dureeMs = endMs - turnStartMs
      turns.push(current)
    }
  }

  for (const ev of events) {
    if (ev.type === 'message_recu') {
      closeTurn(current ? ev.tsMs : null)
      const idx = turns.length
      current = {
        index: idx,
        userText: verbatim[idx]?.userText ?? null,
        userLength: numFromPayload(ev.payload, 'longueur'),
        assistantText: verbatim[idx]?.assistantText ?? null,
        toolsUsed: [],
        toolResults: [],
        intentions: [],
        blocs: [],
        rounds: null,
        dureeMs: null,
        escalade: false,
        erreur: false,
      }
      turnStartMs = ev.tsMs
      continue
    }
    if (!current) continue // événements avant le 1er message (session_ouverte) : ignorés ici

    switch (ev.type) {
      case 'intention_detectee':
        current.intentions.push(...strArrayFromPayload(ev.payload, 'outils'))
        break
      case 'api_appelee':
      case 'graph_interroge': {
        if (ev.toolCalled) current.toolsUsed.push(ev.toolCalled)
        const resume = strFromPayload(ev.payload, 'resume')
        if (resume) current.toolResults.push(`${ev.toolCalled}: ${resume}`)
        break
      }
      case 'reponse_generee':
        current.blocs = strArrayFromPayload(ev.payload, 'blocs')
        current.rounds = numFromPayload(ev.payload, 'rounds')
        break
      case 'contenu_transmis':
        if (current.blocs.length === 0) current.blocs = strArrayFromPayload(ev.payload, 'blocs')
        break
      case 'escalade_conseiller':
        current.escalade = true
        break
      case 'erreur':
        current.erreur = true
        if (ev.statut === 'partiel') current.escalade = true // max_tool_rounds → escalade proposée
        break
    }
  }
  closeTurn(events.length ? events[events.length - 1].tsMs : null)
  return turns
}

/**
 * Reconstruit le transcript complet d'une session Yaye.
 * @param sessionId UUID de session (web) ou `ConversationWhatsApp.id` (WhatsApp).
 */
export async function reconstructTranscript(sessionId: string): Promise<ReconstructedTranscript> {
  const logs = await prisma.agentLog.findMany({
    where: { sessionId },
    orderBy: [{ tsMs: 'asc' }, { createdAt: 'asc' }],
  })

  const events = logs.map(toEvent)
  const first = logs[0] ?? null
  const canal = first?.canal ?? null

  // Texte verbatim : WhatsApp via MessageWhatsApp ; web via YayeTranscriptTurn (option A,
  // si la capture durable est activée). Indexé par tour.
  const verbatim: VerbatimTurn[] = []
  if (canal === 'whatsapp') {
    const waMessages = await prisma.messageWhatsApp.findMany({
      where: { conversationId: sessionId },
      orderBy: { createdAt: 'asc' },
    })
    const waIn = waMessages.filter((m) => m.sens === 'entrant').map((m) => m.contenu)
    const waOut = waMessages.filter((m) => m.sens === 'sortant').map((m) => m.contenu)
    const n = Math.max(waIn.length, waOut.length)
    for (let i = 0; i < n; i++) verbatim[i] = { userText: waIn[i] ?? null, assistantText: waOut[i] ?? null }
  } else if (canal === 'web') {
    const rows = await prisma.yayeTranscriptTurn.findMany({
      where: { sessionId },
      orderBy: { tourIndex: 'asc' },
    })
    for (const r of rows) verbatim[r.tourIndex] = { userText: r.userText, assistantText: r.assistantText }
  }
  const hasVerbatimText = verbatim.some((v) => v != null && (v.userText != null || v.assistantText != null))

  const turns = buildTurns(events, verbatim)
  const debutMs = events.length ? events[0].tsMs : null
  const finMs = events.length ? events[events.length - 1].tsMs : null

  return {
    sessionId,
    canal,
    cjsUid: first?.cjsUid ?? null,
    centreId: first?.centreId ?? null,
    hasVerbatimText,
    turns,
    events,
    nbTours: turns.length,
    dureeMs: debutMs != null && finMs != null ? finMs - debutMs : 0,
    escalade: turns.some((t) => t.escalade),
    debutMs,
    finMs,
  }
}
