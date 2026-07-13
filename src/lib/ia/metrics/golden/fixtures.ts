// Fixtures d'ÉVALUATION : résout des cjsUid RÉELS (avec données) pour les scénarios
// personnalisés. Sans ça le runner jouait `eval-<id>` — un utilisateur fantôme sans
// candidature ni profil — et notait le modèle sur le chemin « état vide ». (Manquement P0-1.)
//
// Impur (Prisma) → hors de `checks.ts`. Appelé une fois au démarrage du runner.

import { prisma } from '@/lib/prisma'
import type { EvalScenario } from './eval-suite'

export type UserNeed = NonNullable<EvalScenario['needsUser']>

export interface EvalFixtures {
  /** cjsUid par besoin de données. */
  byNeed: Record<UserNeed, string | null>
  /** Utilisateur « riche » par défaut (le plus de candidatures) — fallback anonyme. */
  defaultUid: string | null
  /** Diagnostic lisible pour le rapport. */
  summary: string
}

/** Résout les uid réels une fois. Renvoie des null si la base est vide (le runner logguera). */
export async function resolveFixtures(): Promise<EvalFixtures> {
  // Utilisateur le plus « riche » = celui avec le plus de candidatures (a sûrement un profil).
  const topCandid = await prisma.candidature.groupBy({
    by: ['cjsUid'],
    _count: { _all: true },
    orderBy: { _count: { cjsUid: 'desc' } },
    take: 1,
  })
  const richUid = topCandid[0]?.cjsUid ?? null

  // Profil : le riche s'il a un ProfilJeune, sinon le premier profil venu.
  let profileUid: string | null = null
  if (richUid && (await prisma.profilJeune.findUnique({ where: { cjsUid: richUid }, select: { cjsUid: true } }))) {
    profileUid = richUid
  } else {
    profileUid = (await prisma.profilJeune.findFirst({ select: { cjsUid: true } }))?.cjsUid ?? richUid
  }

  // Emprunt en cours : un utilisateur avec un emprunt non rendu (sinon riche par défaut).
  const loanRow = await prisma.emprunt.findFirst({
    where: { statut: { in: ['initie', 'en_cours', 'en_retard'] as never } },
    select: { cjsUid: true },
    orderBy: { initieA: 'desc' },
  }).catch(() => null)
  const loansUid = loanRow?.cjsUid ?? richUid

  const defaultUid = richUid ?? profileUid
  const byNeed: Record<UserNeed, string | null> = {
    candidatures: richUid ?? defaultUid,
    profile: profileUid ?? defaultUid,
    badge: defaultUid,
    loans: loansUid ?? defaultUid,
    any: defaultUid,
  }
  const summary = `candidatures=${byNeed.candidatures ?? '∅'} profile=${byNeed.profile ?? '∅'} loans=${byNeed.loans ?? '∅'}`
  return { byNeed, defaultUid, summary }
}

/** cjsUid à jouer pour un scénario : réel si le scénario a un `needsUser`, sinon uid stable synthétique. */
export function uidForScenario(sc: EvalScenario, fx: EvalFixtures, suffix = ''): string {
  if (sc.needsUser) {
    const real = fx.byNeed[sc.needsUser] ?? fx.defaultUid
    if (real) return real
  }
  return `eval-${sc.id}${suffix}`
}
