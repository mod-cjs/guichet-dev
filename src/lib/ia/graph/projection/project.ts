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
import { deleteRelsOfTypes, detachDeleteNode, mergeNodes, mergeRels, wipeGraph, type RelPair } from './cypher'
import { ensureGraphSchema, OPPORTUNITE_SUBTYPE_LABELS } from './schema'
import {
  buildSkillIndex,
  matchThemeToCategorieSkills,
  parseCompetences,
  type SkillRef,
  type SkillWithCategorie,
} from '../skills-normalize'
import { matchSkillsHybrid, prepareSemanticMatcher } from '../skills-embeddings'

export interface ProjectionReport {
  backend: 'neo4j' | 'skipped'
  durationMs: number
  nodes: Record<string, number>
  relations: Record<string, number>
}

/**
 * GUIC-706 — aplatit une opportunité en propriétés de nœud Neo4j, en portant le drapeau
 * `orgSuspendue` (un partenaire suspendu masque ses offres, y compris dans le graphe) et
 * en retirant l'objet `org` imbriqué (Neo4j ne stocke pas de map imbriquée comme propriété).
 */
export function oppNodeProps<T extends { org?: { statut: string } | null }>(
  row: T,
): Omit<T, 'org'> & { orgSuspendue: boolean } {
  const { org, ...rest } = row
  return { ...rest, orgSuspendue: org?.statut === 'suspendue' }
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

  // Bibliothèque physique (Lot 3) : Livre (catalogue) + Exemplaire (physique, localisé).
  const livres = await prisma.livre.findMany({
    select: { id: true, titre: true, auteur: true, theme: true, niveau: true, langue: true, isbn: true },
  })
  counts.Livre = await mergeNodes('Livre', 'id', livres)

  const exemplaires = await prisma.exemplaire.findMany({
    select: { id: true, codeBarre: true, rayon: true, etagere: true, position: true, statut: true },
  })
  counts.Exemplaire = await mergeNodes('Exemplaire', 'id',
    exemplaires.map(e => ({ ...e, statut: String(e.statut) })))

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
  const oppsRaw = await prisma.opportunite.findMany({
    where: { deletedAt: null },
    select: {
      id: true, slug: true, titre: true, domaine: true, region: true, statut: true,
      deadline: true, remuneration: true, niveauEtudeMin: true, organisationLibelle: true, vues: true,
      // GUIC-706 — le statut de l'org alimente le drapeau de visibilité porté sur le nœud.
      org: { select: { statut: true } },
    },
  })
  const opps = oppsRaw.map(oppNodeProps)
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
    select: {
      id: true, typeId: true, organisationId: true, domaine: true, region: true,
      // GUIC-684 — rattachement M:N (la colonne `programmeId` est dépréciée).
      programmes: { select: { programmeId: true, principal: true } },
    },
  })
  counts.EST_DE_TYPE = await mergeRels('EST_DE_TYPE', 'Opportunite', 'id', 'OpportuniteType', 'id',
    opps.filter(o => o.typeId).map(o => ({ from: o.id, to: o.typeId })))
  counts.FINANCE = await mergeRels('FINANCE', 'Programme', 'id', 'Opportunite', 'id',
    opps.flatMap(o => o.programmes.map(p => ({ from: p.programmeId, to: o.id, principal: p.principal }))))
  counts.PUBLIE = await mergeRels('PUBLIE', 'Organisation', 'id', 'Opportunite', 'id',
    opps.filter(o => o.organisationId).map(o => ({ from: o.organisationId, to: o.id })))

  // GUIC-684 — PORTE : rattachement des ressources et événements à leurs programmes.
  // Nom distinct de FINANCE : un programme ne « finance » pas une fiche pédagogique,
  // il la porte.
  const ressourcesProg = await prisma.ressourceProgramme.findMany({
    select: { ressourceId: true, programmeId: true, principal: true },
  })
  counts.PORTE = await mergeRels('PORTE', 'Programme', 'id', 'RessourcePedagogique', 'id',
    ressourcesProg.map(r => ({ from: r.programmeId, to: r.ressourceId, principal: r.principal })))

  const evenementsProg = await prisma.evenementProgramme.findMany({
    select: { evenementId: true, programmeId: true, principal: true },
  })
  counts.PORTE += await mergeRels('PORTE', 'Programme', 'id', 'Evenement', 'id',
    evenementsProg.map(e => ({ from: e.programmeId, to: e.evenementId, principal: e.principal })))

  // GUIC-684 — ACTEURS. Deux relations distinctes plutôt qu'un PORTE générique :
  // un centre HÉBERGE le déploiement d'un programme, une organisation en est
  // PARTENAIRE. Confondre les deux rendrait « quels centres déploient YEAH ? »
  // impossible à distinguer de « quels partenaires ? » côté Cypher.
  const centresProg = await prisma.centreProgramme.findMany({
    select: { centreId: true, programmeId: true, principal: true },
  })
  counts.DEPLOYE_A = await mergeRels('DEPLOYE_A', 'Programme', 'id', 'Centre', 'id',
    centresProg.map(c => ({ from: c.programmeId, to: c.centreId, principal: c.principal })))

  const organisationsProg = await prisma.organisationProgramme.findMany({
    select: { organisationId: true, programmeId: true, principal: true },
  })
  counts.ASSOCIE_A = await mergeRels('ASSOCIE_A', 'Programme', 'id', 'Organisation', 'id',
    organisationsProg.map(o => ({ from: o.programmeId, to: o.organisationId, principal: o.principal })))

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

  // Bibliothèque (Lot 3) : CONTIENT (Livre→Exemplaire) + EST_LOCALISE_EN (Exemplaire→Centre).
  const exemplairesRel = await prisma.exemplaire.findMany({ select: { id: true, livreId: true, centreId: true } })
  counts.CONTIENT = await mergeRels('CONTIENT', 'Livre', 'id', 'Exemplaire', 'id',
    exemplairesRel.map(e => ({ from: e.livreId, to: e.id })))
  counts.EST_LOCALISE_EN = await mergeRels('EST_LOCALISE_EN', 'Exemplaire', 'id', 'Centre', 'id',
    exemplairesRel.map(e => ({ from: e.id, to: e.centreId })))

  return counts
}

// ── Relations dérivées par matching FLOU (R2) ──────────────────────────────────

async function projectDerived(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  const skills = await prisma.skill.findMany({ select: { id: true, slug: true, libelle: true, categorie: true } })
  const index = buildSkillIndex(skills as SkillRef[])

  // profil → cjsUid (les certificats/diplômes sont rattachés via profilId).
  const profils = await prisma.profilJeune.findMany({ select: { id: true, cjsUid: true, competences: true } })
  const profilToUid = new Map(profils.map(p => [p.id, p.cjsUid]))

  // Appariement SÉMANTIQUE (GUIC-677) : le lexical rate « Développement web » vs
  // « Programmation front-end ». On pré-charge les vecteurs de TOUS les textes à
  // apparier en une passe (sinon un aller-retour Redis par compétence de chaque
  // profil). `null` si la fonctionnalité est désactivée → lexical strict, comme avant.
  const certsPourVecteurs = await prisma.certificatMoodle.findMany({ select: { formation: true } })
  const diplomesPourVecteurs = await prisma.diplome.findMany({ select: { intitule: true } })
  const themesPourVecteurs = await prisma.ressource.findMany({ select: { theme: true } })
  const semantic = await prepareSemanticMatcher(skills as SkillRef[], [
    ...profils.flatMap(p => parseCompetences(p.competences)),
    ...certsPourVecteurs.map(c => c.formation),
    ...diplomesPourVecteurs.map(d => d.intitule),
    ...themesPourVecteurs.map(r => r.theme),
  ])

  // MAITRISE = compétences auto-déclarées (profil) ∪ compétences ATTESTÉES par
  // les certificats/diplômes (spec 02 §4 : « competences (Json) + dérivée des
  // certificats/diplômes »). Sans ce 2e canal, un cert Moodle non re-saisi
  // apparaîtrait à tort comme une compétence manquante dans l'analyse d'écart.
  const maitrise: RelPair[] = []
  for (const p of profils) {
    for (const comp of parseCompetences(p.competences)) {
      for (const m of matchSkillsHybrid(comp, index, semantic)) maitrise.push({ from: p.cjsUid, to: m.id })
    }
  }

  // ATTESTE : Certificat.formation + Diplome.intitule → Competence (flou).
  // Au passage, on dérive MAITRISE depuis le bénéficiaire propriétaire.
  const certs = await prisma.certificatMoodle.findMany({ select: { id: true, profilId: true, formation: true } })
  const diplomes = await prisma.diplome.findMany({ select: { id: true, profilId: true, intitule: true } })
  const atteste: RelPair[] = []
  const attesteD: RelPair[] = []
  for (const c of certs) {
    const uid = profilToUid.get(c.profilId)
    for (const m of matchSkillsHybrid(c.formation, index, semantic)) {
      atteste.push({ from: c.id, to: m.id })
      if (uid) maitrise.push({ from: uid, to: m.id })
    }
  }
  for (const d of diplomes) {
    const uid = profilToUid.get(d.profilId)
    for (const m of matchSkillsHybrid(d.intitule, index, semantic)) {
      attesteD.push({ from: d.id, to: m.id })
      if (uid) maitrise.push({ from: uid, to: m.id })
    }
  }

  counts.MAITRISE = await mergeRels('MAITRISE', 'Beneficiaire', 'cjsUid', 'Competence', 'id', dedupePairs(maitrise))
  counts.ATTESTE = await mergeRels('ATTESTE', 'Certificat', 'id', 'Competence', 'id', dedupePairs(atteste))
  counts.ATTESTE += await mergeRels('ATTESTE', 'Diplome', 'id', 'Competence', 'id', dedupePairs(attesteD))

  // PREPARE : RessourcePedagogique.theme ↔ Competence.categorie (spec 02 §4).
  // Le thème prépare TOUTES les compétences de la/les catégorie(s) qu'il désigne
  // (pas un matching libellé-à-libellé, qui raterait les compétences sœurs).
  const ressources = await prisma.ressource.findMany({ select: { id: true, theme: true } })
  const prepare: RelPair[] = []
  for (const r of ressources) {
    const parCategorie = matchThemeToCategorieSkills(r.theme, skills as SkillWithCategorie[])
    if (parCategorie.length > 0) {
      for (const id of parCategorie) prepare.push({ from: r.id, to: id })
      continue
    }
    // Repli SÉMANTIQUE (GUIC-677) : un thème sans correspondance de catégorie relie les
    // compétences dont le libellé est sémantiquement proche.
    //
    // ⚠️ MESURE DU 2026-07-27 — ce repli ne répare PAS `PREPARE = 0` sur les données
    // actuelles, et c'est un problème de DONNÉES, pas de code. Les deux référentiels ne
    // décrivent pas la même chose :
    //   Ressource.theme  = rubriques éditoriales   → « Emploi », « Formation », « Soft skills »
    //   Skill.categorie  = slugs techniques        → « digital:fin », « agriculture:fin »
    // Aucun recouvrement lexical (0 correspondance sur les 5 thèmes existants), et le
    // sémantique ne produit que du bruit à cette granularité (« Formation » → « Soudure »
    // 0,700 ; « Entrepreneuriat » → « Électricité » 0,668). Le seuil les rejette, à raison.
    //
    // Pour que PREPARE existe, il faut d'abord des thèmes de ressources ALIGNÉS sur des
    // domaines de compétence (« Agriculture durable », « Développement web »), pas des
    // rubriques de navigation. Cf. spec 12, refinement « raffiner les dérivées ».
    for (const m of semantic?.match(r.theme) ?? []) prepare.push({ from: r.id, to: m.id })
  }
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

/** Types de relations qu'une re-projection d'opportunité RECRÉE (donc à purger avant). */
const OPP_PROJECTED_RELS = [
  'EST_DE_TYPE', 'FINANCE', 'PUBLIE', 'RELEVE_DE', 'SITUE_A', 'REQUIERT', 'DEVELOPPE', 'ETIQUETTE',
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
      // GUIC-684 — le rattachement aux programmes vit dans la jonction (1..N).
      programmes: { select: { programmeId: true, principal: true } },
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

  // PURGE des arêtes re-projetées (MERGE est additif → sinon skill/tag retiré = arête fantôme).
  // On ne touche PAS aux arêtes pilotées ailleurs (A_POSTULE, INSCRIT_A, INTERESSE_PAR…).
  await deleteRelsOfTypes('Opportunite', 'id', o.id, OPP_PROJECTED_RELS)

  // Relations cœur.
  if (o.typeId) await mergeRels('EST_DE_TYPE', 'Opportunite', 'id', 'OpportuniteType', 'id', [{ from: o.id, to: o.typeId }])
  // Une arête par programme rattaché : une opportunité cofinancée relève de plusieurs.
  // `principal` sur l'arête permet aux templates de ne retenir QUE le programme porteur
  // là où une seule valeur est attendue — sans quoi le multi-programme dupliquerait les
  // lignes de résultat renvoyées à Yaye.
  if (o.programmes.length > 0) {
    await mergeRels('FINANCE', 'Programme', 'id', 'Opportunite', 'id',
      o.programmes.map(p => ({ from: p.programmeId, to: o.id, principal: p.principal })))
  }
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

// ── Voie événementielle bénéficiaire (fraîcheur du read-model) ────────────────
//
// Sans elle, TOUT ce qui concerne la personne (candidatures, compétences, favoris,
// diplômes/certificats, inscriptions) n'entrait dans le graphe qu'à la reprojection
// nocturne : une offre postulée le matin restait « éligible » toute la journée, et une
// compétence ajoutée au profil restait « manquante » dans l'analyse d'écart.

/** Relations qu'une re-projection de bénéficiaire RECRÉE (donc à purger avant re-merge). */
const BENEFICIAIRE_PROJECTED_RELS = ['MAITRISE', 'A_POSTULE', 'INTERESSE_PAR', 'A_OBTENU', 'A_EXERCE', 'INSCRIT_A']

/**
 * Projette/rafraîchit UN bénéficiaire : son nœud, ses nœuds de parcours (diplômes,
 * certificats, expériences) et toutes ses arêtes personnelles — y compris la dérivée
 * FLOUE `MAITRISE` (profil ∪ certificats ∪ diplômes) et `ATTESTE`, à l'identique de
 * `reprojectAll` (parité stricte : même index de compétences, même matching).
 *
 * Idempotent. No-op si Neo4j non configuré. Les nœuds cibles (Opportunite, Evenement,
 * RessourcePedagogique, Competence) sont supposés déjà projetés — une arête vers un
 * nœud absent est simplement ignorée par `mergeRels` (MATCH), et réparée la nuit.
 */
export async function projectBeneficiaire(cjsUid: string): Promise<boolean> {
  if (!isNeo4jConfigured()) return false
  const user = await prisma.utilisateur.findUnique({
    where: { cjsUid },
    select: {
      cjsUid: true, region: true, deletedAt: true,
      profil: { select: { id: true, niveauEtude: true, situationEmploi: true, completionScore: true, competences: true } },
    },
  })
  if (!user || user.deletedAt) return false
  await ensureGraphSchema()

  const profilId = user.profil?.id
  const [diplomes, certificats, experiences, candidatures, oppFav, resFav, inscriptions, skills] = await Promise.all([
    profilId ? prisma.diplome.findMany({ where: { profilId }, select: { id: true, intitule: true, niveau: true, anneeObtention: true, etablissement: true } }) : [],
    profilId ? prisma.certificatMoodle.findMany({ where: { profilId }, select: { id: true, formation: true, obtenuLe: true, moodleCertId: true } }) : [],
    profilId ? prisma.experience.findMany({ where: { profilId }, select: { id: true, poste: true, organisation: true, dateDebut: true, dateFin: true } }) : [],
    prisma.candidature.findMany({ where: { cjsUid }, select: { opportuniteId: true, statut: true, soumiseA: true } }),
    prisma.opportuniteFavorite.findMany({ where: { cjsUid }, select: { opportuniteId: true } }),
    prisma.ressourceFavorite.findMany({ where: { cjsUid }, select: { ressourceId: true } }),
    prisma.inscriptionEvenement.findMany({ where: { cjsUid }, select: { evenementId: true, statut: true } }),
    prisma.skill.findMany({ select: { id: true, slug: true, libelle: true } }),
  ])

  await mergeNodes('Beneficiaire', 'cjsUid', [{
    cjsUid: user.cjsUid,
    region: user.region,
    niveauEtude: user.profil?.niveauEtude ?? null,
    situationEmploi: user.profil?.situationEmploi ?? null,
    completionScore: user.profil?.completionScore ?? null,
  }])
  await mergeNodes('Diplome', 'id', diplomes)
  await mergeNodes('Certificat', 'id', certificats)
  await mergeNodes('Experience', 'id', experiences)

  // PURGE des arêtes de CETTE personne (MERGE est additif : sans purge, une candidature
  // annulée ou un favori retiré resterait une arête fantôme jusqu'à la nuit).
  await deleteRelsOfTypes('Beneficiaire', 'cjsUid', cjsUid, BENEFICIAIRE_PROJECTED_RELS)
  for (const c of certificats) await deleteRelsOfTypes('Certificat', 'id', c.id, ['ATTESTE'])
  for (const d of diplomes) await deleteRelsOfTypes('Diplome', 'id', d.id, ['ATTESTE'])

  await mergeRels('A_OBTENU', 'Beneficiaire', 'cjsUid', 'Diplome', 'id', diplomes.map(d => ({ from: cjsUid, to: d.id })))
  await mergeRels('A_OBTENU', 'Beneficiaire', 'cjsUid', 'Certificat', 'id', certificats.map(c => ({ from: cjsUid, to: c.id })))
  await mergeRels('A_EXERCE', 'Beneficiaire', 'cjsUid', 'Experience', 'id', experiences.map(e => ({ from: cjsUid, to: e.id })))
  await mergeRels('A_POSTULE', 'Beneficiaire', 'cjsUid', 'Opportunite', 'id',
    candidatures.map(c => ({ from: cjsUid, to: c.opportuniteId, statut: String(c.statut), soumiseA: c.soumiseA })))
  await mergeRels('INTERESSE_PAR', 'Beneficiaire', 'cjsUid', 'Opportunite', 'id',
    oppFav.map(f => ({ from: cjsUid, to: f.opportuniteId })))
  await mergeRels('INTERESSE_PAR', 'Beneficiaire', 'cjsUid', 'RessourcePedagogique', 'id',
    resFav.map(f => ({ from: cjsUid, to: f.ressourceId })))
  await mergeRels('INSCRIT_A', 'Beneficiaire', 'cjsUid', 'Evenement', 'id',
    inscriptions.map(i => ({ from: cjsUid, to: i.evenementId, statut: String(i.statut) })))

  // Dérivées FLOUES (R2) + sémantiques (GUIC-677) — même logique que `projectDerived`,
  // restreinte à cette personne (donc quelques textes seulement à vectoriser).
  const index = buildSkillIndex(skills as SkillRef[])
  const competences = parseCompetences(user.profil?.competences)
  const semantic = await prepareSemanticMatcher(skills as SkillRef[], [
    ...competences,
    ...certificats.map(c => c.formation),
    ...diplomes.map(d => d.intitule),
  ])
  const maitrise: RelPair[] = []
  const atteste: RelPair[] = []
  const attesteD: RelPair[] = []
  for (const comp of competences) {
    for (const m of matchSkillsHybrid(comp, index, semantic)) maitrise.push({ from: cjsUid, to: m.id })
  }
  for (const c of certificats) {
    for (const m of matchSkillsHybrid(c.formation, index, semantic)) {
      atteste.push({ from: c.id, to: m.id })
      maitrise.push({ from: cjsUid, to: m.id })
    }
  }
  for (const d of diplomes) {
    for (const m of matchSkillsHybrid(d.intitule, index, semantic)) {
      attesteD.push({ from: d.id, to: m.id })
      maitrise.push({ from: cjsUid, to: m.id })
    }
  }
  await mergeRels('MAITRISE', 'Beneficiaire', 'cjsUid', 'Competence', 'id', dedupePairs(maitrise))
  await mergeRels('ATTESTE', 'Certificat', 'id', 'Competence', 'id', dedupePairs(atteste))
  await mergeRels('ATTESTE', 'Diplome', 'id', 'Competence', 'id', dedupePairs(attesteD))
  return true
}

/**
 * Déclencheur FAIL-SOFT (fire-and-forget) après une écriture qui touche le parcours du
 * bénéficiaire : candidature, profil/compétences, diplôme, certificat, expérience, favori,
 * inscription. Ne lève jamais, ne bloque jamais la requête appelante.
 */
export function syncBeneficiaireToGraph(cjsUid: string): void {
  void projectBeneficiaire(cjsUid)
    // Le contexte graphe mémoïsé (24 h) décrit CETTE personne : ses données viennent de
    // changer → on l'invalide, sinon Yaye raisonnerait sur une lecture périmée.
    .then(() => import('../../graph-context').then(m => m.purgeGraphContext(cjsUid)))
    .catch(err =>
      logger.warn('[graph:projection] sync bénéficiaire échouée (fail-soft)', { cjsUid, err: String(err) }),
    )
}

// ── Voie événementielle bibliothèque (Lot 3, GUIC-274) ──────────────────────────

/** Relations qu'une re-projection d'exemplaire RECRÉE (donc à purger avant re-merge). */
const EXEMPLAIRE_PROJECTED_RELS = ['EST_LOCALISE_EN']

/**
 * Projette/rafraîchit UN livre (catalogue). Idempotent, no-op si Neo4j non configuré.
 */
export async function projectLivre(id: string): Promise<boolean> {
  if (!isNeo4jConfigured()) return false
  const l = await prisma.livre.findUnique({
    where: { id },
    select: { id: true, titre: true, auteur: true, theme: true, niveau: true, langue: true, isbn: true },
  })
  if (!l) return false
  await ensureGraphSchema()
  await mergeNodes('Livre', 'id', [l])
  return true
}

/**
 * Projette/rafraîchit UN exemplaire + ses relations (CONTIENT depuis son livre,
 * EST_LOCALISE_EN vers son centre). Idempotent, no-op si Neo4j non configuré.
 */
export async function projectExemplaire(id: string): Promise<boolean> {
  if (!isNeo4jConfigured()) return false
  const e = await prisma.exemplaire.findUnique({
    where: { id },
    select: { id: true, codeBarre: true, rayon: true, etagere: true, position: true, statut: true, livreId: true, centreId: true },
  })
  if (!e) return false
  await ensureGraphSchema()
  await mergeNodes('Exemplaire', 'id', [{
    id: e.id, codeBarre: e.codeBarre, rayon: e.rayon, etagere: e.etagere, position: e.position, statut: String(e.statut),
  }])
  await deleteRelsOfTypes('Exemplaire', 'id', e.id, EXEMPLAIRE_PROJECTED_RELS)
  await mergeRels('CONTIENT', 'Livre', 'id', 'Exemplaire', 'id', [{ from: e.livreId, to: e.id }])
  await mergeRels('EST_LOCALISE_EN', 'Exemplaire', 'id', 'Centre', 'id', [{ from: e.id, to: e.centreId }])
  return true
}

/** Déclencheur FAIL-SOFT (fire-and-forget) après création/modif d'un livre. */
export function syncLivreToGraph(id: string): void {
  void projectLivre(id).catch(err =>
    logger.warn('[graph:projection] sync livre échouée (fail-soft)', { id, err: String(err) }),
  )
}

/** Déclencheur FAIL-SOFT (fire-and-forget) après création/modif d'un exemplaire. */
export function syncExemplaireToGraph(id: string): void {
  void projectExemplaire(id).catch(err =>
    logger.warn('[graph:projection] sync exemplaire échouée (fail-soft)', { id, err: String(err) }),
  )
}

/** Retire un exemplaire du graphe (suppression). No-op si Neo4j non configuré. */
export async function removeExemplaireFromGraph(id: string): Promise<boolean> {
  if (!isNeo4jConfigured()) return false
  await detachDeleteNode('Exemplaire', 'id', id)
  return true
}

/** Déclencheur FAIL-SOFT de suppression d'exemplaire (fire-and-forget). */
export function syncExemplaireDeletion(id: string): void {
  void removeExemplaireFromGraph(id).catch(err =>
    logger.warn('[graph:projection] suppression exemplaire échouée (fail-soft)', { id, err: String(err) }),
  )
}

export { OPPORTUNITE_SUBTYPE_LABELS }
