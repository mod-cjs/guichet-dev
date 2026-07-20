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
 * dans la file (autre source / autre URL) ou est déjà publiée dans le Guichet. Le canonique
 * conservé est le plus ANCIEN. Jamais de suppression : traçable et réversible en US-5.
 */

const LOT_DEFAUT = 100
const CANDIDATS_FLOUS = 200
const CANDIDATS_PUBLIES = 50

interface Deps {
  lotMax?: number
}
export interface RapportDedup {
  itemsExamines: number
  doublonsMarques: number
}

function orgDe(payload: unknown): string {
  const p = payload as { organisation?: unknown } | null
  return typeof p?.organisation === 'string' ? p.organisation : ''
}
function deadlineDe(payload: unknown): string {
  const p = payload as { deadline?: unknown } | null
  return typeof p?.deadline === 'string' ? p.deadline : ''
}

export async function executerDedup(deps: Deps = {}): Promise<RapportDedup> {
  const lotMax = deps.lotMax ?? LOT_DEFAUT

  // Items à dédupliquer : a_valider pas encore examinés (empreinteContenu non posée),
  // du plus ancien au plus récent → le canonique (plus ancien) est traité en premier.
  const items = await prisma.itemCuration.findMany({
    where: { statut: 'a_valider', empreinteContenu: null },
    orderBy: { createdAt: 'asc' },
    take: lotMax,
  })

  let doublonsMarques = 0

  for (const item of items) {
    const org = orgDe(item.payloadExtrait)
    const empreinte = empreinteContenu(item.titre, org)
    // Toujours poser l'empreinte (même sans titre → null) pour ne pas re-examiner.
    await prisma.itemCuration.update({
      where: { id: item.id },
      data: { empreinteContenu: empreinte },
    })
    if (!empreinte || !item.titre) continue

    const canoniqueId = await trouverCanonique(item.id, empreinte, item.titre, org, deadlineDe(item.payloadExtrait))
    if (canoniqueId === 'PUBLIE') {
      await prisma.itemCuration.update({ where: { id: item.id }, data: { statut: 'doublon' } })
      doublonsMarques++
    } else if (canoniqueId) {
      await prisma.itemCuration.update({
        where: { id: item.id },
        data: { statut: 'doublon', doublonDeId: canoniqueId },
      })
      doublonsMarques++
    }
  }

  logger.info('curation.dedup.termine', { itemsExamines: items.length, doublonsMarques })
  return { itemsExamines: items.length, doublonsMarques }
}

/** Renvoie l'id du canonique (item), la sentinelle 'PUBLIE', ou null si pas de doublon. */
async function trouverCanonique(
  selfId: string,
  empreinte: string,
  titre: string,
  org: string,
  deadline: string,
): Promise<string | 'PUBLIE' | null> {
  // 1) Doublon EXACT dans la file (même empreinte contenu, plus ancien).
  const exact = await prisma.itemCuration.findFirst({
    where: { empreinteContenu: empreinte, statut: 'a_valider', id: { not: selfId } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (exact) return exact.id

  // 2) Déjà PUBLIÉ : une Opportunite publiée au même titre+organisation (normalisés).
  const tNorm = normaliser(titre)
  const oNorm = normaliser(org)
  const tokenLong = [...tokensTitre(titre)].sort((a, b) => b.length - a.length)[0]
  if (tokenLong) {
    const opps = await prisma.opportunite.findMany({
      where: { statut: 'publiee', deletedAt: null, titre: { contains: tokenLong } },
      take: CANDIDATS_PUBLIES,
      select: { titre: true, organisation: true, organisationLibelle: true },
    })
    for (const o of opps) {
      const oOrg = normaliser(o.organisation || o.organisationLibelle || '')
      if (normaliser(o.titre) === tNorm && (!oNorm || !oOrg || oOrg === oNorm)) return 'PUBLIE'
    }
  }

  // 3) QUASI-doublon : titre similaire (Jaccard ≥ seuil) ET organisation OU deadline concordante.
  const refTokens = tokensTitre(titre)
  const candidats = await prisma.itemCuration.findMany({
    where: {
      statut: 'a_valider',
      id: { not: selfId },
      empreinteContenu: { not: null },
      titre: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: CANDIDATS_FLOUS,
    select: { id: true, titre: true, payloadExtrait: true },
  })
  for (const c of candidats) {
    const sim = similariteJaccard(refTokens, tokensTitre(c.titre))
    if (sim < SEUIL_SIMILARITE) continue
    const cOrg = normaliser(orgDe(c.payloadExtrait))
    const cDeadline = deadlineDe(c.payloadExtrait)
    const orgConcorde = oNorm && cOrg && oNorm === cOrg
    const deadlineConcorde = deadline && cDeadline && deadline === cDeadline
    if (orgConcorde || deadlineConcorde) return c.id
  }

  return null
}
