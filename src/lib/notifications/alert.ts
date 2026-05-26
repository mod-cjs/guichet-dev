import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'

const ALERT_TTL_S = 7 * 24 * 3600

/**
 * Alerte sur abandon d'une notification (4xx permanent ou retries épuisés).
 * Loggue `NOTIF_ABANDONED` et, si `ALERT_WEBHOOK_URL` est configurée, poste
 * un message sur un webhook entrant (Slack / Discord / Google Chat).
 * Idempotente : une alerte par event.
 */
export async function sendAbandonAlert(
  canal: string,
  eventId: string,
  cause: string,
): Promise<void> {
  try {
    const fresh = await redis.set(`notif:alerted:${eventId}`, '1', 'EX', ALERT_TTL_S, 'NX')
    if (!fresh) return // alerte déjà émise pour cet event
  } catch {
    // Redis indisponible — on alerte quand même (doublon toléré).
  }

  logger.error('[notifications] NOTIF_ABANDONED', { code: 'NOTIF_ABANDONED', canal, eventId, cause })

  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[Guichet] Notification abandonnée — canal=${canal} event=${eventId} (${cause})`,
      }),
    })
  } catch (err) {
    logger.warn('[notifications] webhook d’alerte injoignable', { err })
  }
}
