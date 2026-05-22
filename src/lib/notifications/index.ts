import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { whatsappChannel } from './channels/whatsapp'
import { sendAbandonAlert } from './alert'
import { ChannelError, type DlqJob, type NotificationChannel, type NotificationPayload } from './types'

// GUIC-21 / GUIC-83 — Dispatcher de notifications multi-canal.
// Happy path : envoi via after() (fan-out). Échec → DLQ Redis, drainée par cron.

/** Registre des canaux disponibles (email/SMS = tickets de suivi). */
const REGISTRY: NotificationChannel[] = [whatsappChannel]

const DLQ_KEY = 'notif:dlq'
const SENT_TTL_S = 7 * 24 * 3600
const MAX_ATTEMPTS = 3

/** Canaux activés via `NOTIFICATION_CHANNELS` (liste séparée par des virgules). */
function enabledChannels(): NotificationChannel[] {
  const ids = (process.env.NOTIFICATION_CHANNELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return REGISTRY.filter((c) => ids.includes(c.id))
}

function sentKey(canal: string, eventId: string): string {
  return `notif:sent:${canal}:${eventId}`
}

async function alreadySent(canal: string, eventId: string): Promise<boolean> {
  try {
    return Boolean(await redis.get(sentKey(canal, eventId)))
  } catch {
    return false
  }
}

async function markSent(canal: string, eventId: string): Promise<void> {
  try {
    await redis.set(sentKey(canal, eventId), '1', 'EX', SENT_TTL_S)
  } catch {
    // best-effort
  }
}

async function pushDlq(job: DlqJob): Promise<void> {
  try {
    await redis.rpush(DLQ_KEY, JSON.stringify(job))
  } catch (err) {
    logger.error('[notifications] échec de mise en DLQ', { err, eventId: job.eventId })
  }
}

type Outcome = 'ok' | 'retry' | 'abandon'

/** Tente un canal une fois (idempotence incluse). */
async function attemptChannel(
  channel: NotificationChannel,
  payload: NotificationPayload,
): Promise<Outcome> {
  if (await alreadySent(channel.id, payload.eventId)) return 'ok'
  try {
    await channel.send(payload)
    await markSent(channel.id, payload.eventId)
    return 'ok'
  } catch (err) {
    const permanent = err instanceof ChannelError && err.permanent
    logger.warn('[notifications] envoi échoué', {
      canal: channel.id,
      eventId: payload.eventId,
      permanent,
    })
    return permanent ? 'abandon' : 'retry'
  }
}

/**
 * Happy path — confirmation de candidature, appelée via `after()` post-réponse.
 * Fan-out sur les canaux activés ; ne dispatch que si le flag global et le
 * consentement utilisateur sont vrais.
 */
export async function notifyCandidatureConfirmee(
  payload: NotificationPayload,
  consent: boolean,
): Promise<void> {
  if (process.env.NOTIFICATIONS_ENABLED !== 'true') return
  if (!consent) return

  await Promise.allSettled(
    enabledChannels().map(async (channel) => {
      if (!channel.isConfigured(payload)) return
      const outcome = await attemptChannel(channel, payload)
      if (outcome === 'retry') {
        await pushDlq({ canal: channel.id, eventId: payload.eventId, payload, attempts: 1 })
      } else if (outcome === 'abandon') {
        await sendAbandonAlert(channel.id, payload.eventId, 'erreur permanente')
      }
    }),
  )
}

/**
 * Drain de la file morte — rejoue un lot borné de jobs.
 * Retry transitoire borné à `MAX_ATTEMPTS` ; au-delà → abandon + alerte.
 */
export async function drainDlq(maxJobs = 50): Promise<{ retried: number; abandoned: number }> {
  let retried = 0
  let abandoned = 0

  for (let i = 0; i < maxJobs; i++) {
    let raw: string | null
    try {
      raw = await redis.lpop(DLQ_KEY)
    } catch {
      break
    }
    if (!raw) break

    const job = JSON.parse(raw) as DlqJob
    const channel = REGISTRY.find((c) => c.id === job.canal)
    if (!channel) continue

    const outcome = await attemptChannel(channel, job.payload)
    if (outcome === 'ok') {
      retried++
    } else if (outcome === 'abandon' || job.attempts + 1 >= MAX_ATTEMPTS) {
      abandoned++
      await sendAbandonAlert(
        job.canal,
        job.eventId,
        outcome === 'abandon' ? 'erreur permanente' : `${MAX_ATTEMPTS} tentatives épuisées`,
      )
    } else {
      await pushDlq({ ...job, attempts: job.attempts + 1 })
    }
  }

  return { retried, abandoned }
}
