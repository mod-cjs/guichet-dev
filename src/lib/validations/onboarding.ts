import { z } from 'zod'

export const stepIdentiteSchema = z.object({
  nom: z
    .string({ required_error: 'Le nom est obligatoire' })
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long (100 caractères maximum)'),
  prenom: z
    .string({ required_error: 'Le prénom est obligatoire' })
    .trim()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(100, 'Le prénom est trop long (100 caractères maximum)'),
  dateNaissance: z
    .string({
      required_error: 'La date de naissance est obligatoire',
      invalid_type_error: 'La date de naissance est obligatoire',
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date de naissance est obligatoire'),
  // Le genre n'est jamais persisté en « Autre » (enum Prisma = M|F). « Non précisé »
  // est donc envoyé à null. La requiredness « un choix a été fait » se valide
  // côté UI sur l'état tri-state via `validateIdentiteProfil` (cf GUIC-442).
  genre: z.enum(['M', 'F']).optional().nullable(),
})

export const stepLocalisationSchema = z.object({
  region:  z.string().min(1, 'La région est obligatoire'),
  commune: z.string().max(100, 'La commune est trop longue (100 caractères maximum)').optional().nullable(),
})

export const stepProfilSchema = z.object({
  niveauEtude:     z.string().optional().nullable(),
  situationEmploi: z.string().optional().nullable(),
  domainesInteret: z.array(z.string()).max(5).optional().default([]),
})

export type StepIdentiteData    = z.infer<typeof stepIdentiteSchema>
export type StepLocalisationData = z.infer<typeof stepLocalisationSchema>
export type StepProfilData      = z.infer<typeof stepProfilSchema>

/** État tri-state du choix de genre dans le formulaire profil. */
export type GenreChoice = 'M' | 'F' | 'Autre' | null

/**
 * Valide l'identité du profil onboarding **côté client** et retourne un dico
 * d'erreurs par champ (vide = valide). Source unique partagée par l'écran mobile
 * (`OnboardingProfil`) et le hook web (`useProfilStep`) — GUIC-442 / GUIC-443.
 *
 * Le genre est tri-state :
 *   - `null`    → aucun choix fait → **bloquant** (« Le genre est obligatoire »)
 *   - `'Autre'` → « Non précisé » → choix valide, envoyé à `null` côté API
 *   - `'M'|'F'` → choix valide, persisté
 */
export function validateIdentiteProfil(input: {
  nom: string
  prenom: string
  dateNaissance: string
  genre: GenreChoice
}): Record<string, string> {
  const errs: Record<string, string> = {}

  const parsed = stepIdentiteSchema.safeParse({
    nom: input.nom.trim(),
    prenom: input.prenom.trim(),
    dateNaissance: input.dateNaissance || null,
    genre: input.genre === 'M' || input.genre === 'F' ? input.genre : null,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !errs[key]) errs[key] = issue.message
    }
  }

  // Genre : un choix explicite est requis (null = pas de bouton pressé).
  if (input.genre === null) errs.genre = 'Le genre est obligatoire'

  return errs
}
