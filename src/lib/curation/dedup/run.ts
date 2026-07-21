import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  normaliser,
  empreinteContenu,
  tokensTitre,
  similariteJaccard,
  SEUIL_SIMILARITE,
} from './empreinte'

/**
 * GUIC-599 — US-4 : déduplication de CONTENU (phase 3 du cron veille).
 * Marque `doublon` (avec `doublonDeId`) tout item `a_valider` dont l'annonce existe déjà
 * dans la file (autre source / autre URL) ou est déjà publiée. Le canonique conservé est
 * le plus ANCIEN. Jamais de suppression : traçable et réversible en US-5.
 *
 * Principe de prudence (revue adverse 2026-07-20) : **on préfère RATER un doublon que de
 * masquer une vraie opportunité**. Donc on ne déduplique QUE si l'organisation est
 * présente des deux côtés (sinon titres génériques = faux positifs), et la deadline entre
 * dans l'empreinte exacte (2 postes au même titre/employeur, échéances différentes = 2
 * annonces distinctes).
 *
 * ⚠️ Dépendance US-5 : à la repromotion — si un canonique est rejeté/supprimé en US-5,
 * il faut y remonter le doublon le plus ancien en `a_valider`. Non implémenté ici.
 * ⚠️ Appelé sous verrou Redis par le cron (`avecVerrouVeille`) — pas de garde interne.
 */

const LOT_DEFAUT = 100
const CANDIDATS_FLOUS = 200
const CANDIDATS_PUBLIES = 50
const SENTINELLE_SANS_EMPREINTE = 'SANS_EMPREINTE' // marque « examiné » sans clé exploitable

interface Deps {
  lotMax?: number
  /** Restreint le traitement à ces sources (isolation des tests parallèles). Undefined = global (prod). */
  sourceIds?: string[]
}
export interface RapportDedup {
  itemsExamines: number
  doublonsMarques: number
}

function champTexte(payload: unknown, cle: 'organisation' | 'deadline'): string {
  const p = payload as Record<string, unknown> | null
  return typeof p?.[cle] === 'string' ? (p[cle] as string) : ''
}

export async function executerDedup(deps: Deps = {}): Promise<RapportDedup> {
  const lotMax = deps.lotMax ?? LOT_DEFAUT
  const scope = deps.sourceIds ? { sourceId: { in: deps.sourceIds } } : {}

  // Items à dédupliquer : a_valider AVEC titre, pas encore examinés (empreinteContenu null),
  // du plus ancien au plus récent → le canonique (plus ancien) est traité en premier.
  const items = await prisma.itemCuration.findMany({
    where: { statut: 'a_valider', empreinteContenu: null, titre: { not: null }, ...scope },
    orderBy: { createdAt: 'asc' },
    take: lotMax,
  })

  let doublonsMarques = 0

  for (const item of items) {
    const org = champTexte(item.payloadExtrait, 'organisation')
    const deadline = champTexte(item.payloadExtrait, 'deadline')
    const empreinte = empreinteContenu(item.titre, org, deadline)
    // Sentinelle si le titre se normalise en vide → l'item est marqué examiné (anti-famine).
    await prisma.itemCuration.update({
      where: { id: item.id },
      data: { empreinteContenu: empreinte ?? SENTINELLE_SANS_EMPREINTE },
    })
    if (!empreinte || !item.titre) continue

    const canonique = await trouverCanonique(item.id, empreinte, item.titre, org, deadline, scope)
    if (canonique === 'PUBLIE') {
      await prisma.itemCuration.update({ where: { id: item.id }, data: { statut: 'doublon' } })
      doublonsMarques++
    } else if (canonique) {
      await prisma.itemCuration.update({
        where: { id: item.id },
        data: { statut: 'doublon', doublonDeId: canonique },
      })
      doublonsMarques++
    }
  }

  logger.info('curation.dedup.termine', { itemsExamines: items.length, doublonsMarques })
  return { itemsExamines: items.length, doublonsMarques }
}

/** Canonique (id item), 'PUBLIE', ou null. On ne déduplique jamais sur titre seul. */
async function trouverCanonique(
  selfId: string,
  empreinte: string,
  titre: string,
  org: string,
  deadline: string,
  scope: { sourceId?: { in: string[] } },
): Promise<string | 'PUBLIE' | null> {
  const oNorm = normaliser(org)
  const tNorm = normaliser(titre)

  // Sans organisation, on refuse de dédupliquer (titres génériques = faux positifs graves).
  if (!oNorm) return null

  // 1) Doublon EXACT (même titre+org+deadline via l'empreinte), plus ancien.
  const exact = await prisma.itemCuration.findFirst({
    where: { empreinteContenu: empreinte, statut: 'a_valider', id: { not: selfId }, ...scope },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (exact) return exact.id

  // 2) Déjà PUBLIÉ : Opportunite publiée au même titre ET même organisation (deux présents).
  const tokenLong = [...tokensTitre(titre)].sort((a, b) => b.length - a.length)[0]
  if (tokenLong) {
    const opps = await prisma.opportunite.findMany({
      where: { statut: 'publiee', deletedAt: null, titre: { contains: tokenLong } },
      orderBy: { createdAt: 'desc' },
      take: CANDIDATS_PUBLIES,
      select: { titre: true, organisation: true, organisationLibelle: true },
    })
    for (const o of opps) {
      const oOrg = normaliser(o.organisation || o.organisationLibelle || '')
      if (normaliser(o.titre) === tNorm && oOrg && oOrg === oNorm) return 'PUBLIE'
    }
  }

  // 3) QUASI-doublon (titre similaire + org concordante + deadlines compatibles).
  return quasiCanonique(selfId, titre, oNorm, deadline, scope)
}

/** Quasi-doublon : Jaccard ≥ seuil, org identique, et deadlines toutes deux absentes OU égales. */
async function quasiCanonique(
  selfId: string,
  titre: string,
  oNorm: string,
  deadline: string,
  scope: { sourceId?: { in: string[] } },
): Promise<string | null> {
  const refTokens = tokensTitre(titre)
  const tokenLong = [...refTokens].sort((a, b) => b.length - a.length)[0]
  if (!tokenLong) return null

  // Pré-filtre SQL par token discriminant (pas un simple take chronologique aveugle).
  const candidats = await prisma.itemCuration.findMany({
    where: {
      statut: 'a_valider',
      id: { not: selfId },
      empreinteContenu: { not: null },
      titre: { not: null, contains: tokenLong },
      ...scope,
    },
    orderBy: { createdAt: 'asc' },
    take: CANDIDATS_FLOUS,
    select: { id: true, titre: true, payloadExtrait: true },
  })
  for (const c of candidats) {
    if (similariteJaccard(refTokens, tokensTitre(c.titre)) < SEUIL_SIMILARITE) continue
    const cOrg = normaliser(champTexte(c.payloadExtrait, 'organisation'))
    if (!cOrg || cOrg !== oNorm) continue // org identique obligatoire
    const cDeadline = champTexte(c.payloadExtrait, 'deadline')
    // Deadlines incompatibles (les deux présentes et différentes) → annonces distinctes.
    if (deadline && cDeadline && deadline !== cDeadline) continue
    return c.id
  }
  return null
}
