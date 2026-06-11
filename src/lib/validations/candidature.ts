import { z } from 'zod'
import {
  LETTRE_MIN_CHARS,
  LETTRE_MAX_CHARS,
  CV_URL_MAX_LEN,
} from '@/lib/constants/candidature'

// Hostname whitelist : URL Vercel Blob (GUIC-218 / CDP).
// 3 formats observés :
//   - Public   : https://<store>.public.blob.vercel-storage.com/<pathname>
//   - Privé    : https://<store>.private.blob.vercel-storage.com/<pathname>  ← notre cas (CDP)
//   - Bare     : https://<store>.blob.vercel-storage.com/<pathname>
const VERCEL_BLOB_URL_RE = /^https:\/\/[a-z0-9-]+(?:\.(?:public|private))?\.blob\.vercel-storage\.com\//

// Anti-XSS basique sur la lettre de motivation : pas de balise <script>,
// pas d'URL `javascript:`, pas d'attribut événementiel `on…=`.
const XSS_RE = /<script|javascript:|on\w+\s*=/i

/** Lettre de motivation — longueur + sanitization XSS basique. */
const lettreSchema = z
  .string()
  .trim()
  .min(LETTRE_MIN_CHARS, {
    message: `La lettre doit faire au moins ${LETTRE_MIN_CHARS} caractères`,
  })
  .max(LETTRE_MAX_CHARS, {
    message: `La lettre ne peut pas dépasser ${LETTRE_MAX_CHARS} caractères`,
  })
  .refine((s) => !XSS_RE.test(s), { message: 'Contenu non autorisé' })

/** URL CV — doit être hébergée sur Vercel Blob. */
const cvUrlSchema = z
  .string()
  .url({ message: 'URL invalide' })
  .max(CV_URL_MAX_LEN, { message: 'URL trop longue' })
  .refine((url) => VERCEL_BLOB_URL_RE.test(url), {
    message: 'URL Vercel Blob invalide',
  })

/**
 * Snapshot des champs saisis dans le formulaire de candidature (GUIC-361).
 * Persistés dans `Candidature.formulaireData` (Json) pour figer ce qui a été
 * transmis au recruteur, indépendamment du profil ultérieur.
 */
const formulaireDataSchema = z
  .object({
    email: z.string().email().max(255).nullable().optional(),
    telephone: z.string().max(30).nullable().optional(),
    niveauEtude: z.string().max(50).nullable().optional(),
    situationEmploi: z.string().max(50).nullable().optional(),
    competences: z.array(z.string().max(80)).max(20).optional(),
    domainesInteret: z.array(z.string().max(80)).max(20).optional(),
  })
  .optional()

/** Body de `POST /api/candidatures` (GUIC-21 / GUIC-218 / GUIC-361). */
export const CandidatureBodySchema = z.object({
  opportuniteId: z.string().uuid(),
  lettreMotivation: lettreSchema,
  cvUrl: cvUrlSchema.optional(),
  notificationsConsent: z.boolean().default(false),
  formulaireData: formulaireDataSchema,
})

export type CandidatureBody = z.infer<typeof CandidatureBodySchema>

// Exports utiles pour tests et autres consumers
export { lettreSchema, cvUrlSchema, VERCEL_BLOB_URL_RE }
