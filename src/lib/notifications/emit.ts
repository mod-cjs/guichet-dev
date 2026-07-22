// Moteur d'émission d'événements notifiables — GUIC-548.
// Point d'entrée unique : emitEvent(eventKey, ctx). Résout, pour chaque destinataire,
// canaux = config_admin ∩ préférence ∩ consentement ∩ contact, puis fan-out idempotent.
// Fail-soft : une notification n'interrompt jamais la mutation métier appelante.

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import type { TypeNotification } from '@prisma/client'
import { getEventDef, type NotificationChannelId, type NotificationRole } from './catalog'
import { resolveChannels, type ChannelPref } from './resolve'
import { ChannelError, type ChannelMessage, type GenericChannel } from './message'
import { inAppChannel } from './channels/in-app'
import { smsChannel } from './channels/sms'
import { emailChannel } from './channels/email'
import { whatsappGenericChannel } from './channels/whatsapp-generic'

// whatsapp ne livre que les événements dont le template Meta est mappé (GUIC-551) — les autres
// sont ignorés via isConfigured, sans erreur.
const REGISTRY: Partial<Record<NotificationChannelId, GenericChannel>> = {
  in_app: inAppChannel,
  whatsapp: whatsappGenericChannel,
  sms: smsChannel,
  email: emailChannel,
}

/** Canaux externes (coût + consentement) — gardés derrière NOTIFICATIONS_ENABLED. */
const EXTERNAL: readonly NotificationChannelId[] = ['whatsapp', 'sms', 'email']
const SENT_TTL_S = 60 * 60 * 24 * 7 // 7 jours
const DLQ_KEY = 'notif:dlq'

export interface EmitRecipient {
  cjsUid: string
  role: NotificationRole
  prenom: string
  telephone: string | null
  email: string | null
}

export interface EmitContext {
  /** Identifiant de l'entité déclencheuse — compose la clé d'idempotence. */
  entityId: string
  recipients: EmitRecipient[]
  type: TypeNotification
  titre: string
  contenu: string
  lien?: string
  iconName?: string
  metaPill?: string
}

async function alreadySent(canal: string, eventId: string): Promise<boolean> {
  return (await redis.get(`notif:sent:${canal}:${eventId}`)) !== null
}

async function markSent(canal: string, eventId: string): Promise<void> {
  await redis.set(`notif:sent:${canal}:${eventId}`, '1', 'EX', SENT_TTL_S)
}

async function deliver(
  canal: NotificationChannelId,
  adapter: GenericChannel,
  msg: ChannelMessage,
): Promise<void> {
  if (await alreadySent(canal, msg.eventId)) return
  try {
    await adapter.send(msg)
    await markSent(canal, msg.eventId)
  } catch (err) {
    const permanent = err instanceof ChannelError && err.permanent
    if (permanent) {
      logger.error('NOTIF_ABANDONED', { canal, eventId: msg.eventId, cause: (err as Error).message })
    } else {
      await redis.rpush(DLQ_KEY, JSON.stringify({ canal, eventId: msg.eventId, msg, attempts: 0 }))
    }
  }
}

/**
 * Émet un événement notifiable vers ses destinataires.
 * @param eventKey clé du catalogue (src/lib/notifications/catalog.ts).
 */
export async function emitEvent(eventKey: string, ctx: EmitContext): Promise<void> {
  if (!getEventDef(eventKey)) {
    logger.warn('[notif] événement inconnu du catalogue', { eventKey })
    return
  }
  const externalEnabled = process.env.NOTIFICATIONS_ENABLED === 'true'

  for (const r of ctx.recipients) {
    try {
      const config = await prisma.notificationEventConfig.findUnique({
        where: { eventKey_role: { eventKey, role: r.role } },
      })
      if (config && !config.actif) continue
      const configCanaux = config ? (config.canaux as NotificationChannelId[]) : null

      const prefRows = await prisma.notificationPreference.findMany({ where: { cjsUid: r.cjsUid } })
      const prefs: Partial<Record<NotificationChannelId, ChannelPref>> = {}
      const categoriesOff = new Set<string>()
      for (const p of prefRows) {
        prefs[p.canal as NotificationChannelId] = { consentGiven: p.consentGiven, enabled: p.enabled }
        for (const k of ((p.categoriesOff as string[] | null) ?? [])) categoriesOff.add(k)
      }

      const channels = resolveChannels({
        eventKey,
        role: r.role,
        configCanaux,
        prefs,
        categoriesOff: [...categoriesOff],
        contact: { telephone: Boolean(r.telephone), email: Boolean(r.email) },
      })

      for (const canal of channels) {
        if (EXTERNAL.includes(canal) && !externalEnabled) continue
        const adapter = REGISTRY[canal]
        if (!adapter) {
          logger.warn('[notif] canal résolu mais non implémenté', { canal, eventKey })
          continue
        }
        const eventId = `${eventKey}:${ctx.entityId}:${r.cjsUid}`
        const msg: ChannelMessage = {
          eventKey,
          eventId,
          recipient: { cjsUid: r.cjsUid, prenom: r.prenom, telephone: r.telephone, email: r.email },
          type: ctx.type,
          titre: ctx.titre,
          contenu: ctx.contenu,
          lien: ctx.lien,
          iconName: ctx.iconName,
          metaPill: ctx.metaPill,
        }
        // Canal non configurable pour ce message (ex. WhatsApp sans template) → ignoré, pas d'erreur.
        if (adapter.isConfigured && !adapter.isConfigured(msg)) {
          logger.info('[notif] canal non configuré pour cet événement', { canal, eventKey })
          continue
        }
        await deliver(canal, adapter, msg)
      }
    } catch (err) {
      logger.error('[notif] emitEvent destinataire échoué (fail-soft)', {
        eventKey,
        cjsUid: r.cjsUid,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
