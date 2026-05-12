import { z } from 'zod'

export const stepIdentiteSchema = z.object({
  nom:           z.string().min(2).max(100),
  prenom:        z.string().min(2).max(100),
  dateNaissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  genre:         z.enum(['M', 'F']).optional().nullable(),
})

export const stepLocalisationSchema = z.object({
  region:  z.string().min(1, 'La région est obligatoire'),
  commune: z.string().max(100).optional().nullable(),
})

export const stepProfilSchema = z.object({
  niveauEtude:     z.string().optional().nullable(),
  situationEmploi: z.string().optional().nullable(),
  domainesInteret: z.array(z.string()).max(5).optional().default([]),
})

export type StepIdentiteData    = z.infer<typeof stepIdentiteSchema>
export type StepLocalisationData = z.infer<typeof stepLocalisationSchema>
export type StepProfilData      = z.infer<typeof stepProfilSchema>
