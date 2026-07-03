'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { TypeEvenement, StatutEvenement } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-477 — Rédaction de publications (événements) par le conseiller.
 * L'événement est créé au centre du conseiller (périmètre forcé). Le corps est
 * sanitisé serveur (anti-XSS). NB : la validation admin préalable (statut « en
* validé (a_venir) ou refusé (refuse) par l'admin. Corps sanitisé (anti-XSS).
 */
const schema = z.object({
  titre: z.string().trim().min(3, 'Titre requis').max(200),
  description: z.string().trim().min(1, 'Description requise'),
  type: z.nativeEnum(TypeEvenement),
  dateDebut: z.coerce.date(),
  lieu: z.string().trim().min(1, 'Lieu requis').max(200),
  capaciteMax: z.coerce.number().int().positive().max(100000).optional().nullable(),
})
export interface PublicationInput {
  titre: string
  type: TypeEvenement
  dateDebut: string
  lieu: string
  description: string
  capaciteMax?: number | null
}

export async function creerPublication(input: PublicationInput): Promise<ApiResponse<{ id: string }>> {
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides.' } }
  }
  const d = parsed.data

  const e = await prisma.evenement.create({
    data: {
      titre: d.titre,
      description: sanitizeRichHtml(d.description),
      type: d.type,
      statut: StatutEvenement.en_relecture,
      dateDebut: d.dateDebut,
      lieu: d.lieu,
      centreId: ctx.centreId, // périmètre forcé : le centre du conseiller
      capaciteMax: d.capaciteMax ?? null,
      estGratuit: true,
    },
    select: { id: true },
  })

  revalidatePath('/conseiller/publications')
  return { data: e }
}
