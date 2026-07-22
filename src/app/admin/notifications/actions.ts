'use server'

/**
 * GUIC-550 — Configuration de la matrice de notifications (admin).
 * L'admin choisit, pour chaque (événement × rôle), les canaux activés. Fallback = catalogue.
 */
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import {
  buildEventMatrix,
  validateChannelSelection,
  type MatrixCell,
  type MatrixOverride,
} from '@/lib/notifications/matrix'
import type { CJSSession } from '@/types/user'
import type { NotificationChannelId } from '@/lib/notifications/catalog'

/** Garde admin — fail-closed. */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

/** Charge la matrice complète (catalogue fusionné avec les surcharges DB). */
export async function loadNotificationMatrix(): Promise<MatrixCell[]> {
  await assertAdmin()
  const rows = await prisma.notificationEventConfig.findMany()
  const overrides: MatrixOverride[] = rows.map((r) => ({
    eventKey: r.eventKey,
    role: r.role,
    canaux: (r.canaux as NotificationChannelId[]) ?? [],
    actif: r.actif,
  }))
  return buildEventMatrix(overrides)
}

/** Définit les canaux d'un (événement × rôle). Upsert idempotent + audit. */
export async function setEventChannels(
  eventKey: string,
  role: string,
  canaux: string[],
  actif: boolean,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const clean = validateChannelSelection(eventKey, role, canaux)

  await prisma.notificationEventConfig.upsert({
    where: { eventKey_role: { eventKey, role } },
    create: { eventKey, role, canaux: clean, actif, updatedBy: session.cjsUid },
    update: { canaux: clean, actif, updatedBy: session.cjsUid },
  })

  await recordAudit(session.cjsUid, 'notif.config', {
    targetType: 'notification_event_config',
    targetId: `${eventKey}:${role}`,
    meta: { canaux: clean, actif },
  })

  revalidatePath('/admin/notifications')
  return { ok: true }
}
