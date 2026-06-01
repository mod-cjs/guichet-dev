/**
 * GUIC-183 (M3 v2 — 178b/4) — Vérification de l'invariant XOR sur les opportunités.
 *
 * Conformément à `.agent_context/specs/M3-schema-polymorphique.md` §8.4 (DP4).
 *
 * Pour chaque `Opportunite` (non soft-deleted), on vérifie :
 *  - `typeRef` non null
 *  - exactement 1 sous-type (`emploi|stage|formation|bourse|concours|appelAProjets`)
 *    non null
 *  - ce sous-type aligné avec `typeRef.slug`
 *
 * L'appel CRON quotidien sera câblé dans un ticket dédié ; ici on n'expose que la
 * fonction pure pour permettre son usage en tests + script manuel + future route admin.
 */
import { prisma } from '@/lib/prisma'

/** Raison d'incohérence détectée sur une opportunité donnée. */
export type IntegrityReason =
  | 'TYPE_REF_MANQUANT'
  | 'AUCUN_SOUS_TYPE'
  | 'PLUSIEURS_SOUS_TYPES'
  | 'SOUS_TYPE_INCOHERENT'

export interface OpportuniteIntegrityIssue {
  opportuniteId: string
  slug: string
  reason: IntegrityReason
  expected?: string | null
  actual?: string[]
}

/** Liste des opportunités dont l'invariant XOR est violé. Renvoie `[]` si tout est sain. */
export async function checkOpportuniteIntegrity(): Promise<OpportuniteIntegrityIssue[]> {
  const rows = await prisma.opportunite.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      typeRef: { select: { slug: true } },
      emploi: { select: { opportuniteId: true } },
      stage: { select: { opportuniteId: true } },
      formation: { select: { opportuniteId: true } },
      bourse: { select: { opportuniteId: true } },
      concours: { select: { opportuniteId: true } },
      appelAProjets: { select: { opportuniteId: true } },
    },
  })

  const issues: OpportuniteIntegrityIssue[] = []
  for (const r of rows) {
    if (!r.typeRef) {
      issues.push({ opportuniteId: r.id, slug: r.slug, reason: 'TYPE_REF_MANQUANT' })
      continue
    }
    const present: string[] = []
    if (r.emploi) present.push('emploi')
    if (r.stage) present.push('stage')
    if (r.formation) present.push('formation')
    if (r.bourse) present.push('bourse')
    if (r.concours) present.push('concours')
    if (r.appelAProjets) present.push('appel_a_projets')

    if (present.length === 0) {
      issues.push({
        opportuniteId: r.id,
        slug: r.slug,
        reason: 'AUCUN_SOUS_TYPE',
        expected: r.typeRef.slug,
        actual: [],
      })
      continue
    }
    if (present.length > 1) {
      issues.push({
        opportuniteId: r.id,
        slug: r.slug,
        reason: 'PLUSIEURS_SOUS_TYPES',
        expected: r.typeRef.slug,
        actual: present,
      })
      continue
    }
    if (present[0] !== r.typeRef.slug) {
      issues.push({
        opportuniteId: r.id,
        slug: r.slug,
        reason: 'SOUS_TYPE_INCOHERENT',
        expected: r.typeRef.slug,
        actual: present,
      })
    }
  }
  return issues
}
