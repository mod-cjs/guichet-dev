import { z } from 'zod'

// GUIC-24 — validations API ressources & favoris ressources.

export const RessourceFavoriBodySchema = z.object({
  ressourceId: z.string().uuid(),
})

export type RessourceFavoriBody = z.infer<typeof RessourceFavoriBodySchema>

export const RessourceFavoriListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
})
