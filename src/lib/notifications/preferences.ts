'use server'

/**
 * GUIC-554 — Préférences & consentement de notification par canal (côté utilisateur).
 * Self-scoped : chaque utilisateur ne gère que ses propres préférences.
 * in_app est toujours actif et sans consentement ; whatsapp/sms/email exigent un opt-in CDP.
 */
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannelId,
} from './catalog'
import type { CJSSession } from '@/types/user'

export interface ChannelPreferenceView {
  canal: NotificationChannelId
  consentGiven: boolean
  enabled: boolean
  /** in_app ne requiert pas de consentement (toujours disponible). */
  requiresConsent: boolean
}

async function requireUser(): Promise<CJSSession> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHENTICATED')
  return session
}

/** Charge les préférences des 4 canaux pour l'utilisateur courant (défauts si absent). */
export async function loadMyChannelPreferences(): Promise<ChannelPreferenceView[]> {
  const session = await requireUser()
  const rows = await prisma.notificationPreference.findMany({ where: { cjsUid: session.cjsUid } })
  const byCanal = new Map(rows.map((r) => [r.canal as NotificationChannelId, r]))

  return NOTIFICATION_CHANNELS.map((canal) => {
    const row = byCanal.get(canal)
    const requiresConsent = canal !== 'in_app'
    return {
      canal,
      consentGiven: requiresConsent ? Boolean(row?.consentGiven) : true,
      enabled: row ? row.enabled : true,
      requiresConsent,
    }
  })
}

const VALID_CANAUX = new Set<string>(NOTIFICATION_CHANNELS)

/** Met à jour le consentement et/ou l'activation d'un canal pour l'utilisateur courant. */
export async function setChannelPreference(
  canal: string,
  patch: { consentGiven?: boolean; enabled?: boolean },
): Promise<{ ok: true }> {
  const session = await requireUser()
  if (!VALID_CANAUX.has(canal)) throw new Error(`Canal invalide: ${canal}`)
  if (canal === 'in_app') throw new Error('Le canal in-app est toujours actif et non configurable')

  const update: {
    enabled?: boolean
    consentGiven?: boolean
    consentAt?: Date | null
    consentSource?: string | null
  } = {}
  if (typeof patch.enabled === 'boolean') update.enabled = patch.enabled
  if (typeof patch.consentGiven === 'boolean') {
    update.consentGiven = patch.consentGiven
    update.consentAt = patch.consentGiven ? new Date() : null
    update.consentSource = patch.consentGiven ? 'params' : null
  }

  await prisma.notificationPreference.upsert({
    where: { cjsUid_canal: { cjsUid: session.cjsUid, canal: canal as NotificationChannelId } },
    create: {
      cjsUid: session.cjsUid,
      canal: canal as NotificationChannelId,
      consentGiven: update.consentGiven ?? false,
      consentAt: update.consentAt ?? null,
      consentSource: update.consentSource ?? null,
      enabled: update.enabled ?? true,
    },
    update,
  })

  revalidatePath('/jeune/parametres/notifications')
  revalidatePath('/recruteur/parametres')
  revalidatePath('/conseiller/parametres')
  return { ok: true }
}
