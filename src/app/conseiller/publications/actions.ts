'use server'
import { assertFlag } from '@/lib/flags/guard'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { TypeEvenement, StatutEvenement } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import { replaceProgrammes } from '@/lib/programmes/rattachement'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-477 — Rédaction de publications (événements) par le conseiller.
 * L'événement est créé au centre du conseiller (périmètre forcé), en statut
 * `en_relecture` : invisible du public tant que l'admin ne l'a pas validé
 * (→ `a_venir`) ou refusé (→ `refuse`). Corps riche sanitisé serveur (anti-XSS).
 */
const schema = z.object({
  titre: z.string().trim().min(3, 'Titre requis').max(200),
  description: z.string().trim().min(1, 'Description requise'),
  type: z.nativeEnum(TypeEvenement),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date().optional().nullable(),
  lieu: z.string().trim().min(1, 'Lieu requis').max(200),
  capaciteMax: z.coerce.number().int().positive().max(100000).optional().nullable(),
  estGratuit: z.boolean().optional().default(true),
  // GUIC-684 — rattachement obligatoire, y compris hors admin : sans ça, le
  // conseiller créerait un événement orphelin qu'aucun admin ne pourrait éditer.
  programmeSlugs: z.array(z.string().trim().min(1)).optional().default([]),
  programmePrincipalSlug: z.string().trim().nullish(),
})

export interface PublicationInput {
  titre: string
  type: TypeEvenement
  dateDebut: string
  dateFin?: string | null
  lieu: string
  description: string
  capaciteMax?: number | null
  estGratuit?: boolean
  /** GUIC-684 — programmes de rattachement (au moins un). */
  programmeSlugs?: string[]
  programmePrincipalSlug?: string | null
}

export async function creerPublication(input: PublicationInput): Promise<ApiResponse<{ id: string }>> {
  await assertFlag('m8.publications')
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides.' } }
  }
  const d = parsed.data

  if (d.dateFin && d.dateFin < d.dateDebut) {
    return { error: { code: 'VALIDATION_ERROR', message: 'La date de fin doit être après la date de début.' } }
  }

  if (d.programmeSlugs.length === 0) {
    return {
      error: { code: 'VALIDATION_ERROR', message: 'Sélectionne au moins un programme de rattachement.' },
    }
  }

  // Transaction : pas d'événement orphelin si la résolution des programmes échoue.
  const e = await prisma.$transaction(async (tx) => {
    const created = await tx.evenement.create({
      data: {
        titre: d.titre,
        description: sanitizeRichHtml(d.description),
        type: d.type,
        statut: StatutEvenement.en_relecture,
        dateDebut: d.dateDebut,
        dateFin: d.dateFin ?? null,
        lieu: d.lieu,
        centreId: ctx.centreId, // périmètre forcé : le centre du conseiller
        capaciteMax: d.capaciteMax ?? null,
        estGratuit: d.estGratuit,
      },
      select: { id: true },
    })
    await replaceProgrammes(
      tx,
      {
        purge: () => tx.evenementProgramme.deleteMany({ where: { evenementId: created.id } }),
        creer: (rows) =>
          tx.evenementProgramme.createMany({
            data: rows.map((r) => ({ evenementId: created.id, ...r })),
          }),
      },
      d.programmeSlugs,
      { principalSlug: d.programmePrincipalSlug ?? null },
    )
    return created
  })

  revalidatePath('/conseiller/publications')
  return { data: e }
}
