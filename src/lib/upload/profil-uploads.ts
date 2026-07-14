/**
 * GUIC-360 — Helpers d'upload profil (photo, scan diplôme, scan certificat).
 *
 * Pattern unifié inspiré de `src/app/api/upload/cv/route.ts` (GUIC-225) :
 *  - parser un `FormData` côté serveur (champ « file »),
 *  - vérifier le MIME via whitelist,
 *  - vérifier la signature binaire (magic-bytes) — un MIME annoncé par le
 *    client n'est jamais une preuve (GUIC-241),
 *  - vérifier la taille,
 *  - uploader vers Vercel Blob avec namespacing `cjs_uid` et
 *    `addRandomSuffix: true`.
 *
 * Aucune des trois routes profil ne doit dupliquer cette logique.
 */

import { stockage } from '@/lib/storage'

/** Magic-bytes minimaux pour images + PDF. */
const SIGNATURES: Record<string, ReadonlyArray<readonly number[]>> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]],                            // %PDF-
  'image/jpeg':      [[0xff, 0xd8, 0xff]],                                        // JPEG SOI
  'image/png':       [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],          // PNG
  // WebP : RIFF????WEBP — on vérifie 'RIFF' (0..3) + 'WEBP' (8..11).
  'image/webp':      [[0x52, 0x49, 0x46, 0x46]],
}

/** Vérifie qu'un buffer commence par l'un des prefixes attendus pour `mime`. */
export function hasValidMagicBytes(mime: string, buf: Uint8Array): boolean {
  const expected = SIGNATURES[mime]
  if (!expected) return false
  const matched = expected.some(prefix =>
    buf.length >= prefix.length && prefix.every((b, i) => buf[i] === b),
  )
  if (!matched) return false
  // Vérif additionnelle pour WebP : « WEBP » à l'offset 8.
  if (mime === 'image/webp') {
    const webp = [0x57, 0x45, 0x42, 0x50]
    return buf.length >= 12 && webp.every((b, i) => buf[8 + i] === b)
  }
  return true
}

export interface UploadValidationOk {
  ok: true
  file: File
  buffer: Uint8Array
}
export interface UploadValidationErr {
  ok: false
  status: number
  code: 'VALIDATION_ERROR' | 'INVALID_MIME' | 'FILE_TOO_LARGE' | 'INVALID_FILE_CONTENT'
  message: string
}
export type UploadValidation = UploadValidationOk | UploadValidationErr

export interface ParseAndValidateOptions {
  /** Liste de MIME types autorisés. */
  allowedMimes: readonly string[]
  /** Taille max en octets. */
  maxBytes: number
  /** Nombre d'octets à lire pour vérifier les magic-bytes (défaut 16). */
  headerBytes?: number
}

/**
 * Parse le FormData (champ « file ») et valide MIME + taille + magic-bytes.
 * Renvoie un objet typé permettant à la route de répondre directement sans
 * dupliquer les branches d'erreur.
 */
export async function parseAndValidateUpload(
  request: Request,
  opts: ParseAndValidateOptions,
): Promise<UploadValidation> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'FormData attendu' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'Champ "file" manquant' }
  }

  if (!opts.allowedMimes.includes(file.type)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_MIME',
      message: `Format invalide (${opts.allowedMimes.join(', ')} requis)`,
    }
  }

  if (file.size > opts.maxBytes) {
    return {
      ok: false,
      status: 400,
      code: 'FILE_TOO_LARGE',
      message: `Fichier trop volumineux (max ${Math.round(opts.maxBytes / 1024 / 1024)} MB)`,
    }
  }

  const head = new Uint8Array(await file.slice(0, opts.headerBytes ?? 16).arrayBuffer())
  if (!hasValidMagicBytes(file.type, head)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_FILE_CONTENT',
      message: 'Le contenu du fichier ne correspond pas au format déclaré',
    }
  }

  return { ok: true, file, buffer: head }
}

/** Sanitize un nom de fichier (caractères non `[a-zA-Z0-9._-]` → `_`). */
export function sanitizeFilename(name: string, fallback: string): string {
  return (name || fallback).replace(/[^a-zA-Z0-9._-]/g, '_')
}

export interface UploadToBlobOptions {
  /** Préfixe logique (« profil-photo », « diplome-scan », « certif-scan »…). */
  prefix: string
  cjsUid: string
  file: File
  /** Sous-clé optionnelle (ex : id du diplôme) intercalée dans le pathname. */
  subKey?: string
  cacheControlMaxAge?: number
}

/** Cache court (24h) — limite l'exposition des fichiers orphelins. */
const DEFAULT_BLOB_CACHE_MAX_AGE_SEC = 60 * 60 * 24

/** Résultat d'un dépôt : `url` est la RÉFÉRENCE à persister en base. */
export interface ResultatUpload {
  /** Référence persistée (`s3://bucket/clé` en production, URL Vercel sur le miroir de dev). */
  url: string
  /** Chemin logique dans le bucket. */
  pathname: string
}

/**
 * GUIC-565 — Dépose `file` sur le stockage objet ACTIF (MinIO en production OVH, Vercel Blob
 * sur le miroir de dev) et renvoie la référence à persister.
 *
 * Le nom `url` est conservé pour ne pas toucher aux 4 appelants ni aux colonnes existantes —
 * mais ce n'est plus une URL publique en production : les CV, photos et diplômes sont des
 * DONNÉES PERSONNELLES, servies par l'application après vérification de l'autorisation.
 */
export async function uploadToBlob(opts: UploadToBlobOptions): Promise<ResultatUpload> {
  const ext = opts.file.name.includes('.') ? opts.file.name.split('.').pop() : 'bin'
  const safeName = sanitizeFilename(opts.file.name, `${opts.prefix}.${ext}`)
  const sub = opts.subKey ? `${opts.subKey}/` : ''
  const chemin = `${opts.prefix}/${opts.cjsUid}/${sub}${safeName}`

  const depose = await stockage().televerser({
    chemin,
    fichier: opts.file,
    cacheMaxAgeSec: opts.cacheControlMaxAge ?? DEFAULT_BLOB_CACHE_MAX_AGE_SEC,
    // Comportement d'origine préservé (photos, diplômes, certificats étaient déposés en
    // `public`). Sujet CDP à trancher séparément — pas à changer en douce dans ce ticket.
    acces: 'public',
  })
  return { url: depose.reference, pathname: depose.chemin }
}

// ─── Constantes partagées profil ────────────────────────────────────────────

/** Photo de profil — JPEG/PNG/WebP, 5 MB max. */
export const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_PHOTO_BYTES    = 5 * 1024 * 1024

/** Justificatif diplôme/certificat — PDF + images, 10 MB max. */
export const ALLOWED_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_DOC_BYTES    = 10 * 1024 * 1024

/** Rate limit profil uploads (5/min/cjsUid). */
export const RATE_LIMIT_PROFIL_UPLOAD = { max: 5, windowMs: 60_000 } as const
