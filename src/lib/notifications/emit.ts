// Moteur d'émission d'événements notifiables — GUIC-548 (+ modes GUIC-547 évolution).
// Point d'entrée unique : emitEvent(eventKey, ctx). Résout, pour chaque destinataire,
// canaux = config_admin ∩ préférence ∩ consentement ∩ contact, puis selon le MODE :
//   auto       → fan-out immédiat idempotent + journalisation (NotificationEnvoi)
//   validation → lignes en_attente_validation (un humain valide l'occurrence)
//   differe    → lignes planifiee (dueAt = now + delaiMinutes, envoyées par cron)
// Fail-soft : une notification n'interrompt jamais la mutation métier appelante.

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import type { ModeNotification, TypeNotification } from '@prisma/client'
import { notificationMasquee } from '@/lib/flags/notifications'
import { canalOuvert } from '@/lib/flags/canaux'
import { getEventDef, type NotificationChannelId, type NotificationRole } from './catalog'
import { resolveChannels, type ChannelPref } from './resolve'
import { ChannelError, type ChannelMessage, type GenericChannel } from './message'
import { inAppChannel } from './channels/in-app'
import { smsChannel } from './channels/sms'
import { emailChannel } from './channels/email'
import { whatsappGenericChannel } from './channels/whatsapp-generic'

// whatsapp ne livre que les événements dont le template Meta est mappé (GUIC-551) — les autres
// sont ignorés via isConfigured, sans erreur.
export const REGISTRY: Partial<Record<NotificationChannelId, GenericChannel>> = {
  in_app: inAppChannel,
  whatsapp: whatsappGenericChannel,
  sms: smsChannel,
  email: emailChannel,
}

const SENT_TTL_S = 60 * 60 * 24 * 7 // 7 jours
/** File morte du moteur (format ChannelMessage) — distincte du legacy `notif:dlq` (GUIC-83). */
export const ENGINE_DLQ_KEY = 'notif:dlq:v2'

export interface EngineDlqJob {
  canal: NotificationChannelId
  envoiId: string | null
  msg: ChannelMessage
  attempts: number
}

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

type Outcome = 'envoyee' | 'echec_retry' | 'abandonnee' | 'deja_envoyee'

/** Journalise un envoi (historique permanent). Fail-soft : ne bloque jamais l'envoi. */
async function recordEnvoi(
  msg: ChannelMessage,
  canal: NotificationChannelId,
  role: NotificationRole,
  statut: 'envoyee' | 'echec_retry' | 'abandonnee' | 'en_attente_validation' | 'planifiee',
  extra: { erreur?: string; dueAt?: Date } = {},
): Promise<string | null> {
  try {
    const row = await prisma.notificationEnvoi.create({
      data: {
        eventKey: msg.eventKey,
        eventId: msg.eventId,
        cjsUid: msg.recipient.cjsUid,
        role,
        canal,
        type: msg.type,
        titre: msg.titre,
        contenu: msg.contenu,
        lien: msg.lien ?? null,
        iconName: msg.iconName ?? null,
        statut,
        erreur: extra.erreur?.slice(0, 500) ?? null,
        dueAt: extra.dueAt ?? null,
        envoyeeA: statut === 'envoyee' ? new Date() : null,
      },
      select: { id: true },
    })
    return row.id
  } catch (err) {
    logger.error('[notif] journalisation envoi échouée', {
      eventId: msg.eventId,
      canal,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/** Livre immédiatement (idempotent) ; pousse en DLQ v2 les échecs transitoires. */
export async function deliver(
  canal: NotificationChannelId,
  adapter: GenericChannel,
  msg: ChannelMessage,
  envoiId: string | null = null,
): Promise<Outcome> {
  if (await alreadySent(canal, msg.eventId)) return 'deja_envoyee'
  try {
    await adapter.send(msg)
    await markSent(canal, msg.eventId)
    return 'envoyee'
  } catch (err) {
    const permanent = err instanceof ChannelError && err.permanent
    if (permanent) {
      logger.error('NOTIF_ABANDONED', { canal, eventId: msg.eventId, cause: (err as Error).message })
      return 'abandonnee'
    }
    const job: EngineDlqJob = { canal, envoiId, msg, attempts: 0 }
    await redis.rpush(ENGINE_DLQ_KEY, JSON.stringify(job))
    return 'echec_retry'
  }
}

/**
 * Émet un événement notifiable vers ses destinataires.
 * @param eventKey clé du catalogue (src/lib/notifications/catalog.ts).
 */
export async function emitEvent(eventKey: string, ctx: EmitContext): Promise<void> {
  const def = getEventDef(eventKey)
  if (!def) {
    logger.warn('[notif] événement inconnu du catalogue', { eventKey })
    return
  }

  // GUIC-706 — un module masqué ne notifie plus. C'est la fuite la plus insidieuse des
  // surfaces d'incidence : elle SORT de la plateforme. Un jeune recevrait un WhatsApp ou
  // un e-mail à propos d'une fonctionnalité devenue invisible pour lui, et cliquerait sur
  // un lien qui répond 404.
  //
  // Filtré ici, à l'émission, plutôt qu'à la livraison : une notification retenue en file
  // partirait quand même au rejeu de la DLQ.
  if (await notificationMasquee(def.module)) {
    logger.info('[notif] événement ignoré, module masqué', { eventKey, module: def.module })
    return
  }
  // GUIC-706 — l'ouverture de chaque canal passe désormais par le catalogue, qui permet
  // de couper l'e-mail sans couper le SMS. `NOTIFICATIONS_ENABLED` survit à l'intérieur de
  // `canalOuvert` comme interrupteur d'urgence : c'est le seul levier qui répond encore
  // quand la base et Redis sont tombés.
  //
  // Résolu UNE fois pour toute l'émission plutôt qu'à chaque destinataire : un événement
  // touchant plusieurs personnes ferait sinon autant de lectures redondantes.
  const ouverts = new Set<string>()
  for (const canal of ['in_app', 'email', 'sms', 'whatsapp'] as const) {
    if (await canalOuvert(canal)) ouverts.add(canal)
  }

  for (const r of ctx.recipients) {
    try {
      const config = await prisma.notificationEventConfig.findUnique({
        where: { eventKey_role: { eventKey, role: r.role } },
      })
      if (config && !config.actif) continue
      const configCanaux = config ? (config.canaux as NotificationChannelId[]) : null
      const mode: ModeNotification = config?.mode ?? 'auto'
      const delaiMinutes = config?.delaiMinutes ?? null

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
        if (!ouverts.has(canal)) continue
        const adapter = REGISTRY[canal]
        if (!adapter) {
          logger.warn('[notif] canal résolu mais non implémenté', { canal, eventKey })
          continue
        }
        const eventId = `${eventKey}:${ctx.entityId}`
        const msg: ChannelMessage = {
          eventKey,
          eventId: `${eventId}:${r.cjsUid}`,
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

        if (mode === 'validation') {
          await recordEnvoi(msg, canal, r.role, 'en_attente_validation')
          continue
        }
        if (mode === 'differe') {
          const dueAt = new Date(Date.now() + (delaiMinutes ?? 60) * 60_000)
          await recordEnvoi(msg, canal, r.role, 'planifiee', { dueAt })
          continue
        }

        const outcome = await deliver(canal, adapter, msg)
        if (outcome !== 'deja_envoyee') {
          await recordEnvoi(msg, canal, r.role, outcome)
        }
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
