import { z } from 'zod'
import { TypeOpportunite } from '@prisma/client'

/**
 * GUIC-596 — US-1 Gestion des sources de veille : contrats de validation.
 *
 * `configExtraction` (sélecteurs CSS, paramètres d'API…) est OBLIGATOIRE pour les
 * méthodes qui ne peuvent pas fonctionner sans configuration (`api`,
 * `html_selecteurs`) ; les autres méthodes de la cascade sont autonomes.
 *
 * Spec : `.agent_context/specs/M3-curation-opportunites.md` §4.
 */

export const METHODES_EXTRACTION = [
  'auto',
  'jsonld',
  'rss',
  'api',
  'html_selecteurs',
  'article_regex',
] as const

export const FREQUENCES_VEILLE = ['horaire', 'six_heures', 'quotidienne', 'hebdomadaire'] as const

export type MethodeExtraction = (typeof METHODES_EXTRACTION)[number]
export type FrequenceVeille = (typeof FREQUENCES_VEILLE)[number]

/** Méthodes inopérantes sans `configExtraction`. */
const METHODES_CONFIG_REQUISE: readonly MethodeExtraction[] = ['api', 'html_selecteurs']

const UrlSource = z
  .string()
  .trim()
  .max(500, 'URL trop longue (500 max)')
  .url('URL invalide')
  .refine((u) => /^https?:\/\//i.test(u), 'Seuls les schémas http(s) sont autorisés')

const Base = z.object({
  nom: z.string().trim().min(3, 'Nom trop court (3 min)').max(120, 'Nom trop long (120 max)'),
  url: UrlSource,
  methode: z.enum(METHODES_EXTRACTION).default('auto'),
  frequence: z.enum(FREQUENCES_VEILLE).default('quotidienne'),
  actif: z.boolean().default(true),
  configExtraction: z.record(z.unknown()).optional(),
  typeDefaut: z.nativeEnum(TypeOpportunite).optional(),
})

function exigeConfig(
  d: { methode?: MethodeExtraction; configExtraction?: Record<string, unknown> },
  ctx: z.RefinementCtx,
): void {
  if (d.methode && METHODES_CONFIG_REQUISE.includes(d.methode) && !d.configExtraction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['configExtraction'],
      message: `configExtraction est requise pour la méthode « ${d.methode} »`,
    })
  }
}

export const SourceVeilleCreateSchema = Base.superRefine(exigeConfig)

export const SourceVeilleUpdateSchema = Base.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Patch vide')
  .superRefine(exigeConfig)

export type SourceVeilleCreateInput = z.infer<typeof SourceVeilleCreateSchema>
export type SourceVeilleUpdateInput = z.infer<typeof SourceVeilleUpdateSchema>
