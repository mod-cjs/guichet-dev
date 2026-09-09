/**
 * GUIC-684 — Contrôle d'intégrité des rattachements aux programmes.
 *
 * POURQUOI CE FICHIER EXISTE : les invariants sont garantis CÔTÉ APPLICATIF
 * (`replaceProgrammes`), rien en base ne les impose. Or la base est aussi écrite par
 * des scripts SQL (dataset enrichi), des migrations et des backfills — chemins qui
 * ne passent pas par le service. Sans contrôle, une dérive reste invisible jusqu'à
 * ce qu'un badge disparaisse ou qu'un export serve un programme arbitraire.
 *
 * Deux régimes, deux niveaux d'exigence :
 *  - CONTENUS (opportunités, ressources, événements) : au moins un programme, et
 *    exactement un `principal` ;
 *  - ACTEURS (centres, organisations) : rattachement facultatif — l'absence n'est
 *    PAS une anomalie ; seule la cohérence du `principal` est vérifiée.
 */
import { prisma } from '@/lib/prisma'

export type IntegriteRaison =
  /** Contenu sans aucun programme alors que le rattachement est obligatoire. */
  | 'SANS_PROGRAMME'
  /** Plusieurs lignes `principal = true` → aucun badge déterministe possible. */
  | 'PLUSIEURS_PRINCIPAUX'
  /** Rattachements présents mais aucun principal → le Data Hub sert un arbitraire. */
  | 'AUCUN_PRINCIPAL'

export type EntiteRattachable =
  | 'opportunite'
  | 'ressource'
  | 'evenement'
  | 'centre'
  | 'organisation'

export interface ProgrammeIntegriteIssue {
  entite: EntiteRattachable
  entiteId: string
  raison: IntegriteRaison
  /** Nombre de rattachements trouvés (contexte pour le diagnostic). */
  rattachements: number
}

/** Agrégat `entiteId → (total, principaux)` pour une table de jonction. */
type Agregat = Map<string, { total: number; principaux: number }>

function agreger(rows: Array<{ id: string; principal: boolean }>): Agregat {
  const map: Agregat = new Map()
  for (const r of rows) {
    const cur = map.get(r.id) ?? { total: 0, principaux: 0 }
    cur.total += 1
    if (r.principal) cur.principaux += 1
    map.set(r.id, cur)
  }
  return map
}

/** Anomalies de `principal` — communes aux deux régimes. */
function issuesPrincipal(
  entite: EntiteRattachable,
  agregat: Agregat,
): ProgrammeIntegriteIssue[] {
  const out: ProgrammeIntegriteIssue[] = []
  for (const [entiteId, { total, principaux }] of agregat) {
    if (principaux > 1) {
      out.push({ entite, entiteId, raison: 'PLUSIEURS_PRINCIPAUX', rattachements: total })
    } else if (principaux === 0 && total > 0) {
      out.push({ entite, entiteId, raison: 'AUCUN_PRINCIPAL', rattachements: total })
    }
  }
  return out
}

/**
 * Liste les anomalies de rattachement. Renvoie `[]` si tout est sain.
 * Lecture seule — ne répare rien : une correction automatique masquerait la cause.
 */
export async function checkProgrammeIntegrity(): Promise<ProgrammeIntegriteIssue[]> {
  const [opp, res, evt, cen, org] = await Promise.all([
    prisma.opportuniteProgramme.findMany({ select: { opportuniteId: true, principal: true } }),
    prisma.ressourceProgramme.findMany({ select: { ressourceId: true, principal: true } }),
    prisma.evenementProgramme.findMany({ select: { evenementId: true, principal: true } }),
    prisma.centreProgramme.findMany({ select: { centreId: true, principal: true } }),
    prisma.organisationProgramme.findMany({ select: { organisationId: true, principal: true } }),
  ])

  const agOpp = agreger(opp.map((r) => ({ id: r.opportuniteId, principal: r.principal })))
  const agRes = agreger(res.map((r) => ({ id: r.ressourceId, principal: r.principal })))
  const agEvt = agreger(evt.map((r) => ({ id: r.evenementId, principal: r.principal })))
  const agCen = agreger(cen.map((r) => ({ id: r.centreId, principal: r.principal })))
  const agOrg = agreger(org.map((r) => ({ id: r.organisationId, principal: r.principal })))

  const issues: ProgrammeIntegriteIssue[] = [
    ...issuesPrincipal('opportunite', agOpp),
    ...issuesPrincipal('ressource', agRes),
    ...issuesPrincipal('evenement', agEvt),
    ...issuesPrincipal('centre', agCen),
    ...issuesPrincipal('organisation', agOrg),
  ]

  // Contenus orphelins — uniquement pour le régime obligatoire.
  const [oppOrphelines, resOrphelines, evtOrphelins] = await Promise.all([
    prisma.opportunite.findMany({
      where: { deletedAt: null, programmes: { none: {} } },
      select: { id: true },
    }),
    prisma.ressource.findMany({ where: { programmes: { none: {} } }, select: { id: true } }),
    prisma.evenement.findMany({ where: { programmes: { none: {} } }, select: { id: true } }),
  ])

  for (const o of oppOrphelines) {
    issues.push({ entite: 'opportunite', entiteId: o.id, raison: 'SANS_PROGRAMME', rattachements: 0 })
  }
  for (const r of resOrphelines) {
    issues.push({ entite: 'ressource', entiteId: r.id, raison: 'SANS_PROGRAMME', rattachements: 0 })
  }
  for (const e of evtOrphelins) {
    issues.push({ entite: 'evenement', entiteId: e.id, raison: 'SANS_PROGRAMME', rattachements: 0 })
  }

  return issues
}
