import { z } from 'zod'

export const MAX_DIPLOMES = 20
export const ANNEE_OBTENTION_MIN = 1950

const MENTIONS = ['passable', 'assez_bien', 'bien', 'tres_bien', 'excellent'] as const

export const DiplomeSchema = z.object({
  intitule:       z.string().min(2).max(200),
  etablissement:  z.string().min(2).max(200),
  anneeObtention: z.number().int().min(ANNEE_OBTENTION_MIN).max(new Date().getFullYear()),
  niveau:         z.string().min(1).max(50),
  mention:        z.enum(MENTIONS).optional().nullable(),
})

export type DiplomeInput = z.infer<typeof DiplomeSchema>
