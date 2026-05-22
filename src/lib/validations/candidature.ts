import { z } from 'zod'

/** Body de `POST /api/candidatures` (GUIC-21). */
export const CandidatureBodySchema = z.object({
  opportuniteId: z.string().uuid(),
  lettreMotivation: z.string().max(2000).optional(),
  notificationsConsent: z.boolean().default(false),
})

export type CandidatureBody = z.infer<typeof CandidatureBodySchema>
