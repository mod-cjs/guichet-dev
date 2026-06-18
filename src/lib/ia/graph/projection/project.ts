// Pipeline de projection Prisma → Neo4j (GUIC-279, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §6
//
// ⚠️ INVARIANT (§0) : Prisma/MariaDB = source de vérité ; Neo4j = read-model
// reconstructible. Sens d'écriture UNIQUE Prisma→Neo4j. Tout en MERGE → idempotent.
// `reprojectAll()` = filet de sécurité (reprojection nocturne complète) ; les
// projecteurs unitaires servent la voie événementielle.
//
// Port TypeScript de yaye-kg-poc (mapping.py + project_to_neo4j.py), via le client
// Prisma (jamais de SQL brut — CLAUDE.md), avec normalisation FLOUE des compétences (R2).

import { prisma } from '@/lib/prisma'
import { TypeRessourceCentre } from '@prisma/client'
import { logger } from '@/lib/logger'
import { isNeo4jConfigured } from '@/lib/neo4j'
import { detachDeleteNode, mergeNodes, mergeRels, wipeGraph, type RelPair } from './cypher'
import { ensureGraphSchema, OPPORTUNITE_SUBTYPE_LABELS } from './schema'
import { buildSkillIndex, matchSkills, parseCompetences, type SkillRef } from '../skills-normalize'

export interface ProjectionReport {
  backend: 'neo4j' | 'skipped'
  durationMs: number
  nodes: Record<string, number>
  relations: Record<string, number>
}

// ── Nœuds ─────────────────────────────────────────────────────────────────────

async function projectNodes(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  // Référentiels & acteurs simples.
  const types = await prisma.opportuniteType.findMany({
    select: { id: true, slug: true, libelle: true, actionLabel: true, requiresFileUpload: true, decisionAuthority: true },
  })
  counts.OpportuniteType = await mergeNodes('OpportuniteType', 'id', types)

  const programmes = await prisma.programme.findMany({
    select: { id: true, slug: true, nom: true, description: true },
  })
  counts.Programme = await mergeNodes('Programme', 'id', programmes)

  const orgs = await prisma.organisation.findMany({
    select: { id: true, nom: true, secteur: true, region: true, estVerifie: true },
  })
  counts.Organisation = await mergeNodes('Organisation', 'id', orgs)

  const skills = await prisma.skill.findMany({
    select: { id: true, slug: true, libelle: true, categorie: true },
  })
  counts.Competence = await mergeNodes('Competence', 'id', skills)

  const tags = await prisma.tag.findMany({ select: { id: true, slug: true, libelle: true } })
  counts.Tag = await mergeNodes('Tag', 'id', tags)

  // Parcours.
  const diplomes = await prisma.diplome.findMany({
    select: { id: true, intitule: true, niveau: true, anneeObtention: true, etablissement: true },
  })
  counts.Diplome = await mergeNodes('Diplome', 'id', diplomes)

  const experiences = await prisma.experience.findMany({
    select: { id: true, poste: true, organisation: true, dateDebut: true, dateFin: true },
  })
  counts.Experience = await mergeNodes('Experience', 'id', experiences)

  const certificats = await prisma.certificatMoodle.findMany({
    select: { id: true, formation: true, obtenuLe: true, moodleCertId: true },
  })
  counts.Certificat = await mergeNodes('Certificat', 'id', certificats)

  // Agenda & ressources pédagogiques.
  const evenements = await prisma.evenement.findMany({
    select: { id: true, titre: true, type: true, statut: true, dateDebut: true, dateFin: true, lieu: true, capaciteMax: true, estGratuit: true },
  })
  counts.Evenement = await mergeNodes('Evenement', 'id', evenements)

  const ressources = await prisma.ressource.findMany({
    select: { id: true, titre: true, type: true, theme: true, niveau: true, langue: true, url: true },
  })
  counts.RessourcePedagogique = await mergeNodes('RessourcePedagogique', 'id', ressources)

  // Centres + ressources physiques (Salle/Vehicule ; biblio physique = Lot 3).
  const centres = await prisma.centre.findMany({
    select: { id: true, nom: true, region: true, latitude: true, longitude: true },
  })
  counts.Centre = await mergeNodes('Centre', 'id', centres)

  const ressourcesCentre = await prisma.ressourceCentre.findMany({
    where: { type: { in: [TypeRessourceCentre.Salle, TypeRessourceCentre.Vehicule] } },
    select: { id: true, nom: true, capacite: true, type: true, centreId: true },
  })
  for (const label of ['Salle', 'Vehicule'] as const) {
    const rows = ressourcesCentre
      .filter(r => r.type === label)
      .map(r => ({ id: r.id, nom: r.nom, capacite: r.capacite }))
    counts[label] = await mergeNodes(label, 'id', rows)
  }

  // Bénéficiaire (données minimales — pas de PII sensible, spec §3.C).
  const users = await prisma.utilisateur.findMany({
    where: { deletedAt: null },
    select: {
      cjsUid: true, region: true,
      profil: { select: { niveauEtude: true, situationEmploi: true, completionScore: true } },
    },
  })
  const beneficiaires = users.map(u => ({
    cjsUid: u.cjsUid,
    region: u.region,
    niveauEtude: u.profil?.niveauEtude ?? null,
    situationEmploi: u.profil?.situationEmploi ?? null,
    completionScore: u.profil?.completionScore ?? null,
  }))
  counts.Beneficiaire = await mergeNodes('Beneficiaire', 'cjsUid', beneficiaires)

  // Opportunités décompressées : nœud commun + 1 label de sous-type (spec §2).
  const opps = await prisma.opportunite.findMany({
    where: { deletedAt: null },
    select: {
      id: true, slug: true, titre: true, domaine: true, region: true, statut: true,
      deadline: true, remuneration: true, niveauEtudeMin: true, organisationLibelle: true, vues: true,
    },
  })
  counts.Opportunite = await mergeNodes('Opportunite', 'id', opps)
  counts.OpportuniteSousTypes = await projectOpportuniteSubtypes()

  // Enums réifiés Secteur (Domaine) & Region.
  const secteurs = new Set<string>()
  for (const o of opps) if (o.domaine) secteurs.add(String(o.domaine))
  for (const o of orgs) if (o.secteur) secteurs.add(String(o.secteur))
  counts.Secteur = await mergeNodes('Secteur', 'libelle', [...secteurs].map(libelle => ({ libelle })))

  const regions = new Set<string>()
  for (const list of [opps, centres, users, orgs]) {
    for (const r of list) if (r.region) regions.add(String(r.region))
  }
  counts.Region = await mergeNodes('Region', 'nom', [...regions].map(nom => ({ nom })))

  return counts
}

/** Projette les 10 tables de sous-type en labels additionnels sur le nœud Opportunite. */
async function projectOpportuniteSubtypes(): Promise<number> {
  let total = 0
  const project = async (label: string, rows: Array<{ opportuniteId: string } & Record<string, unknown>>) => {
    const nodes = rows.map(({ opportuniteId, ...props }) => ({ id: opportuniteId, ...props }))
    total += await mergeNodes('Opportunite', 'id', nodes, [label])
  }
  await project('Emploi', await prisma.opportuniteEmploi.findMany())
  await project('Stage', await prisma.opportuniteStage.findMany())
  await project('Formation', await prisma.opportuniteFormation.findMany())
  await project('Bourse', await prisma.opportuniteBourse.findMany())
  await project('Concours', await prisma.opportuniteConcours.findMany())
  await project('AppelAProjets', await prisma.opportuniteAppelAProjets.findMany())
  await project('Financement', await prisma.opportuniteFinancement.findMany())
  await project('Mentorat', await prisma.opportuniteMentorat.findMany())
  await project('Mobilite', await prisma.opportuniteMobilite.findMany())
  await project('Volontariat', await prisma.opportuniteVolontariat.findMany())
  return total
}

// ── Relations (clés étrangères + jonctions) ─────────────────────────────────────

async function projectRelations(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  const opps = await prisma.opportunite.findMany({
    where: { deletedAt: null },
    select: { id: true, typeId: true, programmeId: true, organisationId: true, domaine: true, region: true },
  })
  counts.EST_DE_TYPE = await mergeRels('EST_DE_TYPE', 'Opportunite', 'id', 'OpportuniteType', 'id',
    opps.filter(o => o.typeId).map(o => ({ from: o.id, to: o.typeId })))
  counts.FINANCE = await mergeRels('FINANCE', 'Programme', 'id', 'Opportunite', 'id',
    opps.filter(o => o.programmeId).map(o => ({ from: o.programmeId, to: o.id })))
  counts.PUBLIE = await mergeRels('PUBLIE', 'Organisation', 'id', 'Opportunite', 'id',
    opps.filter(o => o.organisationId).map(o => ({ from: o.organisationId, to: o.id })))

  // RELEVE_DE / SITUE_A (enums réifiés).
  counts.RELEVE_DE = await mergeRels('RELEVE_DE', 'Opportunite', 'id', 'Secteur', 'libelle',
    opps.filter(o => o.domaine).map(o => ({ from: o.id, to: String(o.domaine) })))
  counts.SITUE_A = await mergeRels('SITUE_A', 'Opportunite', 'id', 'Region', 'nom',
    opps.filter(o => o.region).map(o => ({ from: o.id, to: String(o.region) })))
  const orgs = await prisma.organisation.findMany({ select: { id: true, secteur: true, region: true } })
  counts.RELEVE_DE += await mergeRels('RELEVE_DE', 'Organisation', 'id', 'Secteur', 'libelle',
    orgs.filter(o => o.secteur).map(o => ({ from: o.id, to: String(o.secteur) })))
  counts.SITUE_A += await mergeRels('SITUE_A', 'Organisation', 'id', 'Region', 'nom',
    orgs.filter(o => o.region).map(o => ({ from: o.id, to: String(o.region) })))
  const centresR = await prisma.centre.findMany({ select: { id: true, region: true } })
  counts.SITUE_A += await mergeRels('SITUE_A', 'Centre', 'id', 'Region', 'nom',
    centresR.filter(c => c.region).map(c => ({ from: c.id, to: String(c.region) })))

  // REQUIERT (requise=true) / DEVELOPPE (requise=false, restreint aux Formation).
  const oppSkills = await prisma.opportuniteSkill.findMany({
    select: { opportuniteId: true, skillId: true, requise: true },
  })
  counts.REQUIERT = await mergeRels('REQUIERT', 'Opportunite', 'id', 'Competence', 'id',
    oppSkills.filter(s => s.requise).map(s => ({ from: s.opportuniteId, to: s.skillId, requise: true })))
  const formationIds = new Set(
    (await prisma.opportuniteFormation.findMany({ select: { opportuniteId: true } })).map(f => f.opportuniteId),
  )
  counts.DEVELOPPE = await mergeRels('DEVELOPPE', 'Opportunite', 'id', 'Competence', 'id',
    oppSkills.filter(s => !s.requise && formationIds.has(s.opportuniteId)).map(s => ({ from: s.opportuniteId, to: s.skillId })))

  // ETIQUETTE.
  const oppTags = await prisma.opportuniteTag.findMany({ select: { opportuniteId: true, tagId: true } })
  counts.ETIQUETTE = await mergeRels('ETIQUETTE', 'Opportunite', 'id', 'Tag', 'id',
    oppTags.map(t => ({ from: t.opportuniteId, to: t.tagId })))

  // Parcours via profil → cjsUid.
  const profils = await prisma.profilJeune.findMany({ select: { id: true, cjsUid: true } })
  const profilToUid = new Map(profils.map(p => [p.id, p.cjsUid]))
  const viaProfil = <T extends { profilId: string; id: string }>(rows: T[]): RelPair[] =>
    rows.flatMap(r => {
      const uid = profilToUid.get(r.profilId)
      return uid ? [{ from: uid, to: r.id }] : []
    })
  counts.A_OBTENU = await mergeRels('A_OBTENU', 'Beneficiaire', 'cjsUid', 'Diplome', 'id',
    viaProfil(await prisma.diplome.findMany({ select: { id: true, profilId: true } })))
  counts.A_OBTENU += await mergeRels('A_OBTENU', 'Beneficiaire', 'cjsUid', 'Certificat', 'id',
    viaProfil(await prisma.certificatMoodle.findMany({ select: { id: true, profilId: true } })))
  counts.A_EXERCE = await mergeRels('A_EXERCE', 'Beneficiaire', 'cjsUid', 'Experience', 'id',
    viaProfil(await prisma.experience.findMany({ select: { id: true, profilId: true } })))

  // A_POSTULE / INTERESSE_PAR / INSCRIT_A (clés naturelles cjsUid).
  const candidatures = await prisma.candidature.findMany({
    select: { cjsUid: true, opportuniteId: true, statut: true, soumiseA: true },
  })
  counts.A_POSTULE = await mergeRels('A_POSTULE', 'Beneficiaire', 'cjsUid', 'Opportunite', 'id',
    candidatures.map(c => ({ from: c.cjsUid, to: c.opportuniteId, statut: String(c.statut), soumiseA: c.soumiseA })))

  const oppFav = await prisma.opportuniteFavorite.findMany({ select: { cjsUid: true, opportuniteId: true } })
  counts.INTERESSE_PAR = await mergeRels('INTERESSE_PAR', 'Beneficiaire', 'cjsUid', 'Opportunite', 'id',
    oppFav.map(f => ({ from: f.cjsUid, to: f.opportuniteId })))
  const resFav = await prisma.ressourceFavorite.findMany({ select: { cjsUid: true, ressourceId: true } })
  counts.INTERESSE_PAR += await mergeRels('INTERESSE_PAR', 'Beneficiaire', 'cjsUid', 'RessourcePedagogique', 'id',
    resFav.map(f => ({ from: f.cjsUid, to: f.ressourceId })))

  const inscriptions = await prisma.inscriptionEvenement.findMany({
    select: { cjsUid: true, evenementId: true, statut: true },
  })
  counts.INSCRIT_A = await mergeRels('INSCRIT_A', 'Beneficiaire', 'cjsUid', 'Evenement', 'id',
    inscriptions.map(i => ({ from: i.cjsUid, to: i.evenementId, statut: String(i.statut) })))

  // SE_DEROULE_A / DISPOSE_DE (centres).
  const evChamps = await prisma.evenement.findMany({ where: { centreId: { not: null } }, select: { id: true, centreId: true } })
  counts.SE_DEROULE_A = await mergeRels('SE_DEROULE_A', 'Evenement', 'id', 'Centre', 'id',
    evChamps.map(e => ({ from: e.id, to: e.centreId })))
  const rc = await prisma.ressourceCentre.findMany({
    where: { type: { in: [TypeRessourceCentre.Salle, TypeRessourceCentre.Vehicule] } },
    select: { id: true, centreId: true, type: true },
  })
  counts.DISPOSE_DE = 0
  for (const label of ['Salle', 'Vehicule'] as const) {
    counts.DISPOSE_DE += await mergeRels('DISPOSE_DE', 'Centre', 'id', label, 'id',
      rc.filter(r => r.type === label).map(r => ({ from: r.centreId, to: r.id })))
  }

  return counts
}

// ── Relations dérivées par matching FLOU (R2) ──────────────────────────────────

async function projectDerived(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  const skills = await prisma.skill.findMany({ select: { id: true, slug: true, libelle: true } })
  const index = buildSkillIndex(skills as SkillRef[])

  // MAITRISE : ProfilJeune.competences (Json libre) → Competence (flou).
  const profils = await prisma.profilJeune.findMany({ select: { cjsUid: true, competences: true } })
  const maitrise: RelPair[] = []
  for (const p of profils) {
    for (const comp of parseCompetences(p.competences)) {
      for (const m of matchSkills(comp, index)) maitrise.push({ from: p.cjsUid, to: m.id })
    }
  }
  counts.MAITRISE = await mergeRels('MAITRISE', 'Beneficiaire', 'cjsUid', 'Competence', 'id', dedupePairs(maitrise))

  // ATTESTE : Certificat.formation + Diplome.intitule → Competence (flou).
  const atteste: RelPair[] = []
  const certs = await prisma.certificatMoodle.findMany({ select: { id: true, formation: true } })
  for (const c of certs) for (const m of matchSkills(c.formation, index)) atteste.push({ from: c.id, to: m.id })
  counts.ATTESTE = await mergeRels('ATTESTE', 'Certificat', 'id', 'Competence', 'id', dedupePairs(atteste))
  const diplomes = await prisma.diplome.findMany({ select: { id: true, intitule: true } })
  const attesteD: RelPair[] = []
  for (const d of diplomes) for (const m of matchSkills(d.intitule, index)) attesteD.push({ from: d.id, to: m.id })
  counts.ATTESTE += await mergeRels('ATTESTE', 'Diplome', 'id', 'Competence', 'id', dedupePairs(attesteD))

  // PREPARE : RessourcePedagogique.theme → Competence (flou).
  const ressources = await prisma.ressource.findMany({ select: { id: true, theme: true } })
  const prepare: RelPair[] = []
  for (const r of ressources) for (const m of matchSkills(r.theme, index)) prepare.push({ from: r.id, to: m.id })
  counts.PREPARE = await mergeRels('PREPARE', 'RessourcePedagogique', 'id', 'Competence', 'id', dedupePairs(prepare))

  return counts
}

function dedupePairs(pairs: RelPair[]): RelPair[] {
  const seen = new Set<string>()
  const out: RelPair[] = []
  for (const p of pairs) {
    const k = `${p.from}→${p.to}`
    if (!seen.has(k)) { seen.add(k); out.push(p) }
  }
  return out
}

// ── Orchestrateur ──────────────────────────────────────────────────────────────

/**
 * Reprojection COMPLÈTE Prisma→Neo4j (filet nocturne idempotent).
 * No-op si Neo4j non configuré (le fallback Prisma est alors la source directe).
 */
export async function reprojectAll(opts: { wipe?: boolean } = {}): Promise<ProjectionReport> {
  const started = Date.now()
  if (!isNeo4jConfigured()) {
    logger.info('[graph:projection] Neo4j non configuré → reprojection ignorée')
    return { backend: 'skipped', durationMs: 0, nodes: {}, relations: {} }
  }
  await ensureGraphSchema()
  if (opts.wipe) await wipeGraph()
  const nodes = await projectNodes()
  const relations = { ...(await projectRelations()), ...(await projectDerived()) }
  const durationMs = Date.now() - started
  logger.info('[graph:projection] reprojection terminée', {
    durationMs,
    noeuds: Object.values(nodes).reduce((a, b) => a + b, 0),
    relations: Object.values(relations).reduce((a, b) => a + b, 0),
  })
  return { backend: 'neo4j', durationMs, nodes, relations }
}

// ── Voie événementielle (upsert mono-opportunité) ──────────────────────────────

const SUBTYPE_RELATIONS: ReadonlyArray<readonly [string, string]> = [
  ['Emploi', 'emploi'], ['Stage', 'stage'], ['Formation', 'formation'], ['Bourse', 'bourse'],
  ['Concours', 'concours'], ['AppelAProjets', 'appelAProjets'], ['Financement', 'financement'],
  ['Mentorat', 'mentorat'], ['Mobilite', 'mobilite'], ['Volontariat', 'volontariat'],
]

/**
 * Projette/rafraîchit UNE opportunité (création/modification) + ses relations cœur.
 * Idempotent. No-op si Neo4j non configuré. Les nœuds référentiels (Competence,
 * Programme…) sont supposés déjà projetés (réparés sinon par `reprojectAll`).
 */
export async function projectOpportunite(id: string): Promise<boolean> {
  if (!isNeo4jConfigured()) return false
  const o = await prisma.opportunite.findUnique({
    where: { id },
    include: {
      emploi: true, stage: true, formation: true, bourse: true, concours: true,
      appelAProjets: true, financement: true, mentorat: true, mobilite: true, volontariat: true,
      skills: true, tags: true,
    },
  })
  if (!o || o.deletedAt) return false
  await ensureGraphSchema()

  await mergeNodes('Opportunite', 'id', [{
    id: o.id, slug: o.slug, titre: o.titre, domaine: o.domaine, region: o.region,
    statut: o.statut, deadline: o.deadline, remuneration: o.remuneration,
    niveauEtudeMin: o.niveauEtudeMin, organisationLibelle: o.organisationLibelle, vues: o.vues,
  }])

  // Label de sous-type + props spécifiques (le 1er non-null — invariant XOR).
  for (const [label, key] of SUBTYPE_RELATIONS) {
    const sub = (o as unknown as Record<string, unknown>)[key]
    if (sub) {
      const props: Record<string, unknown> = { ...(sub as Record<string, unknown>) }
      delete props.opportuniteId
      await mergeNodes('Opportunite', 'id', [{ id: o.id, ...props }], [label])
      break
    }
  }

  // Enums réifiés référencés (merge défensif pour ne pas perdre la relation).
  if (o.domaine) await mergeNodes('Secteur', 'libelle', [{ libelle: String(o.domaine) }])
  if (o.region) await mergeNodes('Region', 'nom', [{ nom: String(o.region) }])

  // Relations cœur.
  if (o.typeId) await mergeRels('EST_DE_TYPE', 'Opportunite', 'id', 'OpportuniteType', 'id', [{ from: o.id, to: o.typeId }])
  if (o.programmeId) await mergeRels('FINANCE', 'Programme', 'id', 'Opportunite', 'id', [{ from: o.programmeId, to: o.id }])
  if (o.organisationId) await mergeRels('PUBLIE', 'Organisation', 'id', 'Opportunite', 'id', [{ from: o.organisationId, to: o.id }])
  if (o.domaine) await mergeRels('RELEVE_DE', 'Opportunite', 'id', 'Secteur', 'libelle', [{ from: o.id, to: String(o.domaine) }])
  if (o.region) await mergeRels('SITUE_A', 'Opportunite', 'id', 'Region', 'nom', [{ from: o.id, to: String(o.region) }])
  await mergeRels('REQUIERT', 'Opportunite', 'id', 'Competence', 'id',
    o.skills.filter(s => s.requise).map(s => ({ from: o.id, to: s.skillId, requise: true })))
  if (o.formation) {
    await mergeRels('DEVELOPPE', 'Opportunite', 'id', 'Competence', 'id',
      o.skills.filter(s => !s.requise).map(s => ({ from: o.id, to: s.skillId })))
  }
  await mergeRels('ETIQUETTE', 'Opportunite', 'id', 'Tag', 'id', o.tags.map(t => ({ from: o.id, to: t.tagId })))
  return true
}

/**
 * Déclencheur FAIL-SOFT (fire-and-forget) à appeler après création/modif d'une
 * opportunité. Ne lève jamais, ne bloque jamais la requête appelante.
 */
export function syncOpportuniteToGraph(id: string): void {
  void projectOpportunite(id).catch(err =>
    logger.warn('[graph:projection] sync opportunité échouée (fail-soft)', { id, err: String(err) }),
  )
}

/** Retire une opportunité du graphe (suppression). No-op si Neo4j non configuré. */
export async function removeOpportuniteFromGraph(id: string): Promise<boolean> {
  if (!isNeo4jConfigured()) return false
  await detachDeleteNode('Opportunite', 'id', id)
  return true
}

/** Déclencheur FAIL-SOFT de suppression (fire-and-forget). */
export function syncOpportuniteDeletion(id: string): void {
  void removeOpportuniteFromGraph(id).catch(err =>
    logger.warn('[graph:projection] suppression opportunité échouée (fail-soft)', { id, err: String(err) }),
  )
}

export { OPPORTUNITE_SUBTYPE_LABELS }
