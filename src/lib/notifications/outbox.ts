// Outbox du centre de notifications — GUIC-547 évolution (modes validation/différé).
// Envoie les lignes NotificationEnvoi en attente : validées par un humain, planifiées
// (différé), ou re-tentées depuis la DLQ v2. Les coordonnées du destinataire sont
// relues au moment de l'envoi (fraîcheur > snapshot).

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import type { NotificationEnvoi } from '@prisma/client'
import { REGISTRY, ENGINE_DLQ_KEY, deliver, type EngineDlqJob } from './emit'
import type { NotificationChannelId } from './catalog'
import type { ChannelMessage } from './message'
import { ChannelError } from './message'

const MAX_ATTEMPTS = 3

/** Reconstruit le ChannelMessage d'une ligne d'outbox avec des coordonnées fraîches. */
async function toMessage(envoi: NotificationEnvoi): Promise<ChannelMessage | null> {
  const user = await prisma.utilisateur.findUnique({
    where: { cjsUid: envoi.cjsUid },
    select: { prenom: true, telephone: true, email: true },
  })
  if (!user) return null
  return {
    eventKey: envoi.eventKey,
    eventId: envoi.eventId,
    recipient: {
      cjsUid: envoi.cjsUid,
      prenom: user.prenom,
      telephone: user.telephone,
      email: user.email,
    },
    type: envoi.type,
    titre: envoi.titre,
    contenu: envoi.contenu,
    lien: envoi.lien ?? undefined,
    iconName: envoi.iconName ?? undefined,
  }
}

/** Envoie une ligne d'outbox et met à jour son statut. */
export async function sendEnvoi(envoi: NotificationEnvoi, valideePar?: string): Promise<void> {
  const canal = envoi.canal as NotificationChannelId
  const adapter = REGISTRY[canal]
  const msg = await toMessage(envoi)

  if (!adapter || !msg) {
    await prisma.notificationEnvoi.update({
      where: { id: envoi.id },
      data: { statut: 'abandonnee', erreur: !adapter ? 'canal non implémenté' : 'destinataire introuvable' },
    })
    return
  }

  const outcome = await deliver(canal, adapter, msg, envoi.id)
  await prisma.notificationEnvoi.update({
    where: { id: envoi.id },
    data: {
      statut: outcome === 'deja_envoyee' ? 'envoyee' : outcome,
      envoyeeA: outcome === 'envoyee' || outcome === 'deja_envoyee' ? new Date() : null,
      ...(valideePar ? { valideePar } : {}),
    },
  })
}

/** Valide une occurrence entière : envoie toutes ses lignes en attente. */
export async function validerOccurrence(eventId: string, valideur: string): Promise<number> {
  const rows = await prisma.notificationEnvoi.findMany({
    where: { eventId, statut: 'en_attente_validation' },
  })
  for (const row of rows) {
    await sendEnvoi(row, valideur)
  }
  return rows.length
}

/** Rejette une occurrence entière : aucune ligne ne partira. */
export async function rejeterOccurrence(eventId: string, valideur: string): Promise<number> {
  const res = await prisma.notificationEnvoi.updateMany({
    where: { eventId, statut: 'en_attente_validation' },
    data: { statut: 'rejetee', valideePar: valideur },
  })
  return res.count
}

/** Envoie les lignes différées arrivées à échéance. Appelé par le cron DLQ (≈10 min). */
export async function flushPlanifiees(now: Date = new Date(), max = 200): Promise<number> {
  const rows = await prisma.notificationEnvoi.findMany({
    where: { statut: 'planifiee', dueAt: { lte: now } },
    orderBy: { dueAt: 'asc' },
    take: max,
  })
  for (const row of rows) {
    try {
      await sendEnvoi(row)
    } catch (err) {
      logger.error('[notif] envoi différé échoué', {
        envoiId: row.id,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return rows.length
}

/** Rejoue la DLQ v2 du moteur (échecs transitoires). Abandon après MAX_ATTEMPTS. */
export async function drainEngineDlq(maxJobs = 50): Promise<{ replayed: number; abandoned: number }> {
  let replayed = 0
  let abandoned = 0
  for (let i = 0; i < maxJobs; i++) {
    const raw = await redis.lpop(ENGINE_DLQ_KEY)
    if (!raw) break
    let job: EngineDlqJob
    try {
      job = JSON.parse(raw) as EngineDlqJob
    } catch {
      continue // job illisible : on le laisse tomber (loggué par parse)
    }
    const adapter = REGISTRY[job.canal]
    if (!adapter) continue
    try {
      await adapter.send(job.msg)
      replayed++
      if (job.envoiId) {
        await prisma.notificationEnvoi
          .update({ where: { id: job.envoiId }, data: { statut: 'envoyee', envoyeeA: new Date() } })
          .catch(() => undefined)
      }
    } catch (err) {
      const permanent = err instanceof ChannelError && err.permanent
      job.attempts += 1
      if (permanent || job.attempts >= MAX_ATTEMPTS) {
        abandoned++
        logger.error('NOTIF_ABANDONED', { canal: job.canal, eventId: job.msg.eventId, attempts: job.attempts })
        if (job.envoiId) {
          await prisma.notificationEnvoi
            .update({ where: { id: job.envoiId }, data: { statut: 'abandonnee' } })
            .catch(() => undefined)
        }
      } else {
        await redis.rpush(ENGINE_DLQ_KEY, JSON.stringify(job))
      }
    }
  }
  return { replayed, abandoned }
}
