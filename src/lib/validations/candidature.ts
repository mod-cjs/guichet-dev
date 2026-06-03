import { z } from 'zod'

/** Body de `POST /api/candidatures` (GUIC-21, étendu GUIC-189 — cvUrl Vercel Blob). */
export const CandidatureBodySchema = z.object({
  opportuniteId: z.string().uuid(),
  lettreMotivation: z.string().max(2000).optional(),
  notificationsConsent: z.boolean().default(false),
  /** URL publique du CV uploadé via Vercel Blob (PDF, ≤ 5MB). */
  cvUrl: z.string().url().max(500).optional(),
})

export type CandidatureBody = z.infer<typeof CandidatureBodySchema>
