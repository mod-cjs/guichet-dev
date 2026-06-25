import { logger, hashId } from '@/lib/logger'

/**
 * Audit E1 — traçabilité des accès aux données personnelles (conformité CDP, loi
 * sénégalaise 2008-12). Journalise QUI a accédé à QUOI et QUAND, sans exposer de
 * PII en clair : les `cjsUid` (acteur + cible) sont hachés via `hashId` comme le
 * reste des logs (cf GUIC-218). Le hash permet de détecter une anomalie de volume
 * (un admin qui consulte un nombre anormal de fiches) et, sur suspicion ciblée, de
 * confirmer un accès en re-hachant un `cjsUid` connu.
 *
 * MVP volontairement léger (stdout structuré → collecte OVH, pas de table dédiée) :
 * le DPO formalisera ultérieurement le stockage, la rétention et l'éventuelle
 * réversibilité légale. Le marqueur `message: 'audit.pii'` rend ces lignes
 * extractibles sans ambiguïté vers un futur entrepôt d'audit.
 */
export type AuditAction =
  | 'fiche_beneficiaire.view'
  | 'export.utilisateurs'
  | 'export.opportunites'

export interface AuditPiiOptions {
  /** `cjsUid` du sujet consulté (fiche unique). Omis pour un export de masse. */
  targetCjsUid?: string
  /** Nombre d'enregistrements PII concernés (export). */
  count?: number
  /** Métadonnées non-PII additionnelles (ex. filtres appliqués). */
  meta?: Record<string, unknown>
}

/**
 * Journalise un accès à des données personnelles.
 * @param action  type d'accès (vue de fiche, export…)
 * @param actorCjsUid `cjsUid` de l'agent qui accède (session courante)
 */
export function auditPiiAccess(
  action: AuditAction,
  actorCjsUid: string,
  opts: AuditPiiOptions = {},
): void {
  logger.info('audit.pii', {
    action,
    actor: hashId(actorCjsUid),
    ...(opts.targetCjsUid ? { target: hashId(opts.targetCjsUid) } : {}),
    ...(typeof opts.count === 'number' ? { count: opts.count } : {}),
    ...(opts.meta ?? {}),
  })
}
