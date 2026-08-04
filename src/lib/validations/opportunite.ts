import { z } from 'zod'
import { Domaine, Region, TypeOpportunite } from '@prisma/client'

/** Valeurs d'un enum Prisma sous forme de tuple non vide pour `z.enum`. */
function enumValues<T extends Record<string, string>>(e: T): [string, ...string[]] {
  return Object.values(e) as [string, ...string[]]
}

/** Query params de `GET /api/opportunites` (catalogue public). */
export const OpportuniteQuerySchema = z.object({
  q: z.string().max(120).optional(),
  domaine: z.enum(enumValues(Domaine)).optional(),
  type: z.enum(enumValues(TypeOpportunite)).optional(),
  region: z.enum(enumValues(Region)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  sort_by: z.enum(['recent', 'deadline']).default('recent'),
  // GUIC-689 — remuneration/deadline étaient écrits dans l'URL par les panneaux de
  // filtres mais jamais lus ici : le compteur affichait "1 filtre actif" sans que la
  // liste ne change (filtre décoratif). Valeurs invalides ignorées comme le reste.
  remuneration: z.enum(['yes', 'no']).optional(),
  deadline: z.enum(['7', '30']).optional(),
})

export type OpportuniteQuery = z.infer<typeof OpportuniteQuerySchema>

/** Body de `POST /api/favoris`. */
export const FavoriBodySchema = z.object({
  opportuniteId: z.string().uuid(),
})

export type FavoriBody = z.infer<typeof FavoriBodySchema>
