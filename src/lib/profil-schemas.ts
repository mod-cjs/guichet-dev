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

/**
 * GUIC-689 — Langues déclarées (carte « Compétences & langues »).
 *
 * Niveaux en liste FERMÉE, ordonnée du plus fort au plus faible : la carte les
 * traduit en libellé et en longueur de barre, une valeur libre n'aurait ni
 * l'un ni l'autre. Échelle volontairement courte — une auto-déclaration fine
 * (A1..C2) serait mal remplie et invérifiable.
 */
export const NIVEAUX_LANGUE = ['maternelle', 'courant', 'intermediaire', 'notions'] as const

export const LangueSchema = z.object({
  // `trim` avant la borne min : « ␣␣␣ » n'est pas un nom de langue.
  langue: z.string().trim().min(1, 'Langue requise').max(60),
  niveau: z.enum(NIVEAUX_LANGUE),
})

/** Au-delà, c'est une liste décorative plutôt qu'une information de matching. */
export const MAX_LANGUES = 10

/**
 * GUIC-689 — Engagements associatifs / bénévolat, 3e source de la timeline.
 * Même forme que `ExperienceSchema` : mêmes règles de dates, mêmes bornes.
 */
export const EngagementSchema = z.object({
  role:         z.string().min(1).max(150),
  organisation: z.string().min(1).max(150),
  dateDebut:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
  dateFin:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis').optional().nullable(),
  description:  z.string().max(1000).optional().nullable(),
}).refine(
  data => !data.dateFin || data.dateFin > data.dateDebut,
  { message: 'La date de fin doit être postérieure à la date de début', path: ['dateFin'] },
)

export const MAX_ENGAGEMENTS = 20
