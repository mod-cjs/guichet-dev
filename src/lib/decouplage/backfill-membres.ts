/**
 * GUIC-706 (Phase 2b) — backfill `MembreOrganisation`.
 *
 * Migre le legacy `Organisation.cjsUid` (1:1) vers le modèle 0..N : chaque org dont le
 * `cjsUid` pointe un utilisateur EXISTANT reçoit un membre `titulaire` (actif). Les orgs
 * sans compte (`cjsUid` null) ou orphelines (`cjsUid` sans utilisateur) restent à 0 membre
 * — ce sont des partenaires référencés, pas des recruteurs.
 *
 * Idempotent : la garde `@@unique([organisationId, cjsUid])` + `skipDuplicates` évitent
 * les doublons ; rejouable sans effet de bord.
 */
import { prisma } from '@/lib/prisma'

export interface BackfillResult {
  /** membres titulaires créés lors de cet appel */
  crees: number
  /** orgs sans compte (cjsUid null) — laissées sans membre */
  ignoresSansCompte: number
  /** orgs orphelines (cjsUid sans utilisateur) — laissées sans membre */
  ignoresOrphelines: number
  /** orgs dont le titulaire existait déjà (rejeu) */
  dejaPresents: number
}

export async function backfillMembresTitulaires(): Promise<BackfillResult> {
  const ignoresSansCompte = await prisma.organisation.count({ where: { cjsUid: null } })

  const orgs = await prisma.organisation.findMany({
    where: { cjsUid: { not: null } },
    select: { id: true, cjsUid: true },
  })
  if (orgs.length === 0) {
    return { crees: 0, ignoresSansCompte, ignoresOrphelines: 0, dejaPresents: 0 }
  }

  // utilisateurs éligibles : existants ET NON anonymisés (matrice §4 — un compte
  // anonymisé est délié, il ne devient pas titulaire).
  const uids = [...new Set(orgs.map((o) => o.cjsUid as string))]
  const users = await prisma.utilisateur.findMany({
    where: { cjsUid: { in: uids }, statut: { not: 'anonymise' } },
    select: { cjsUid: true },
  })
  const existants = new Set(users.map((u) => u.cjsUid))

  // membres titulaires déjà présents (rejeu) — clé (org, cjsUid)
  const existingMembres = await prisma.membreOrganisation.findMany({
    where: { organisationId: { in: orgs.map((o) => o.id) } },
    select: { organisationId: true, cjsUid: true },
  })
  const dejaKey = new Set(existingMembres.map((m) => `${m.organisationId}::${m.cjsUid}`))

  let ignoresOrphelines = 0
  let dejaPresents = 0
  const aCreer: { organisationId: string; cjsUid: string; role: 'titulaire'; statut: 'actif' }[] = []

  for (const o of orgs) {
    const uid = o.cjsUid as string
    if (!existants.has(uid)) {
      ignoresOrphelines++
      continue
    }
    if (dejaKey.has(`${o.id}::${uid}`)) {
      dejaPresents++
      continue
    }
    aCreer.push({ organisationId: o.id, cjsUid: uid, role: 'titulaire', statut: 'actif' })
  }

  if (aCreer.length > 0) {
    await prisma.membreOrganisation.createMany({ data: aCreer, skipDuplicates: true })
  }

  return { crees: aCreer.length, ignoresSansCompte, ignoresOrphelines, dejaPresents }
}
