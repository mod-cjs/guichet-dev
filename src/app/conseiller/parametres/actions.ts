'use server'
import { assertFlag } from '@/lib/flags/guard'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import type { ApiResponse } from '@/types/api'

/**
 * Préférences de notification du conseiller (Paramètres). Le compte vit dans le
 * SSO (non modifiable ici) ; on ne stocke que les préférences in-app.
 * `notifCandidatures` = activité du centre (réservations/demandes) ; `notifMessages` = messages.
 */
const schema = z.object({
  notifActivite: z.coerce.boolean(),
  notifMessages: z.coerce.boolean(),
})
export type PreferencesNotifInput = z.input<typeof schema>

export async function modifierPreferencesNotif(input: PreferencesNotifInput): Promise<ApiResponse<{ ok: true }>> {
  await assertFlag('m8.conseiller')
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } }

  const parsed = schema.parse(input)
  await prisma.utilisateur.update({
    where: { cjsUid: session.cjsUid },
    data: { notifCandidatures: parsed.notifActivite, notifMessages: parsed.notifMessages },
  })
  revalidatePath('/conseiller/parametres')
  return { data: { ok: true } }
}
