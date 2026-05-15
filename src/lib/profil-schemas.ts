import { z } from 'zod'

export const ExperienceSchema = z.object({
  poste:        z.string().min(1).max(150),
  organisation: z.string().min(1).max(150),
  dateDebut:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
  dateFin:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis').optional().nullable(),
  description:  z.string().max(1000).optional().nullable(),
}).refine(
  data => !data.dateFin || data.dateFin > data.dateDebut,
  { message: 'La date de fin doit être postérieure à la date de début', path: ['dateFin'] },
)

export const MAX_EXPERIENCES = 20
