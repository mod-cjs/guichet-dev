'use server'

/**
 * GUIC-513 — Préférences de notification du recruteur (Paramètres).
 * Le compte lui-même vit dans le SSO (non modifiable ici) ; seules les préférences
 * de notification in-app sont stockées côté app.
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CJSSession } from '@/types/user'

async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

const schema = z.object({
  notifCandidatures: z.coerce.boolean(),
  notifMessages: z.coerce.boolean(),
})
export type PreferencesNotifInput = z.input<typeof schema>

export async function modifierPreferencesNotif(input: PreferencesNotifInput): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  const parsed = schema.parse(input)
  await prisma.utilisateur.update({
    where: { cjsUid: session.cjsUid },
    data: { notifCandidatures: parsed.notifCandidatures, notifMessages: parsed.notifMessages },
  })
  revalidatePath('/recruteur/parametres')
  return { ok: true }
}
