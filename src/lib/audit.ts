import { logger, hashId } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Audit E1/G3 — traçabilité des actions sensibles (conformité CDP, loi sénégalaise
 * 2008-12). Journalise QUI a fait QUOI, sur QUOI et QUAND.
 *
 * Double écriture :
 *  - **stdout structuré** (acteur/cible HACHÉS via `hashId`) → flux de logs OVH,
 *    détection d'anomalie de volume sans exposer de PII dans des logs peu protégés.
 *  - **table `audit_logs`** (acteur EN CLAIR) → trail interrogeable, consulté par
 *    l'admin (/admin/journal-audit) pour résoudre l'identité dans la timeline.
 *    Table à accès admin uniquement ; rétention/anonymisation = raffinement DPO.
 *
 * La persistance est **fail-soft** : un échec d'écriture n'interrompt jamais la
 * requête métier (une page/route ne casse pas si l'audit échoue).
 */
export type AuditAction =
  | 'fiche_beneficiaire.view'
  | 'export.utilisateurs'
  | 'export.opportunites'
  | 'export.evenements'
  | 'opportunite.approve'
  | 'opportunite.reject'
  | 'opportunite.create'
  | 'opportunite.update'
  | 'opportunite.delete'
  | 'opportunite.publish'

interface AuditEntry {
  actorCjsUid: string
  action: string
  targetType?: string | null
  targetId?: string | null
  meta?: Record<string, unknown>
}

/** Écrit une ligne d'audit en base — ne jette jamais (fail-soft). */
async function persistAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorCjsUid: entry.actorCjsUid,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ...(entry.meta && Object.keys(entry.meta).length
          ? { meta: entry.meta as Prisma.InputJsonValue }
          : {}),
      },
    })
  } catch (e) {
    logger.error('audit.persist_failed', {
      action: entry.action,
      error: e instanceof Error ? e.message : 'unknown',
    })
  }
}

export interface AuditPiiOptions {
  /** `cjsUid` du sujet consulté (fiche unique). Omis pour un export de masse. */
  targetCjsUid?: string
  /** Nombre d'enregistrements PII concernés (export). */
  count?: number
  /** Métadonnées non-PII additionnelles (ex. filtres appliqués). */
  meta?: Record<string, unknown>
}

/**
 * Journalise un accès à des données personnelles (lecture).
 * @param action  type d'accès (vue de fiche, export…)
 * @param actorCjsUid `cjsUid` de l'agent qui accède (session courante)
 */
export async function auditPiiAccess(
  action: AuditAction,
  actorCjsUid: string,
  opts: AuditPiiOptions = {},
): Promise<void> {
  // 1) flux de logs (haché)
  logger.info('audit.pii', {
    action,
    actor: hashId(actorCjsUid),
    ...(opts.targetCjsUid ? { target: hashId(opts.targetCjsUid) } : {}),
    ...(typeof opts.count === 'number' ? { count: opts.count } : {}),
    ...(opts.meta ?? {}),
  })
  // 2) trail interrogeable (clair, admin-only)
  await persistAudit({
    actorCjsUid,
    action,
    targetType: opts.targetCjsUid ? 'utilisateur' : 'collection',
    targetId: opts.targetCjsUid ?? null,
    meta: {
      ...(typeof opts.count === 'number' ? { count: opts.count } : {}),
      ...(opts.meta ?? {}),
    },
  })
}

export interface AuditActionOptions {
  /** Type de cible (ex. 'opportunite', 'centre'). */
  targetType?: string
  /** Identifiant de la cible (non-PII). */
  targetId?: string
  /** Métadonnées non-PII (ex. titre, ancien/nouveau statut). */
  meta?: Record<string, unknown>
}

/**
 * Journalise une action sensible non-PII (modération, validation…).
 * Le `targetId` (id technique d'opportunité, etc.) n'est pas du PII : loggué en clair.
 */
export async function recordAudit(
  actorCjsUid: string,
  action: AuditAction | string,
  opts: AuditActionOptions = {},
): Promise<void> {
  logger.info('audit.action', {
    action,
    actor: hashId(actorCjsUid),
    ...(opts.targetId ? { target: opts.targetId } : {}),
  })
  await persistAudit({
    actorCjsUid,
    action,
    targetType: opts.targetType ?? null,
    targetId: opts.targetId ?? null,
    meta: opts.meta,
  })
}
