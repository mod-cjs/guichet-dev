'use server'
import { assertFlag } from '@/lib/flags/guard'

import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GUIC-581 — Persistance par profil des préférences d'accessibilité.
 *
 * Shape strict : toute clé inconnue ou valeur hors contrat est rejetée
 * (la colonne Json ne doit contenir que le shape A11yPrefs — relu tel quel
 * par le layout jeune puis sanitisé côté client par sanitizeA11yPrefs).
 */
const prefsSchema = z
  .object({
    text: z.enum(['s', 'm', 'l', 'xl']),
    contrast: z.boolean(),
    gray: z.boolean(),
    motion: z.boolean(),
    spacing: z.boolean(),
    falc: z.boolean(),
    kbd: z.boolean(),
    // GUIC-658 — phase 2 : curseur agrandi, guide de lecture, lecture vocale
    cursor: z.boolean(),
    guide: z.boolean(),
    voice: z.boolean(),
  })
  .strict()

export async function modifierPrefsAccessibilite(prefs: unknown): Promise<void> {
  await assertFlag('m2.accessibilite')
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')

  const parsed = prefsSchema.safeParse(prefs)
  if (!parsed.success) throw new Error('VALIDATION')

  await prisma.profilJeune.update({
    where: { cjsUid: session.cjsUid },
    data: { prefsAccessibilite: parsed.data },
  })
}
