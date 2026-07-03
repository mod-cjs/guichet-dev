'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { TypeEvenement, StatutEvenement } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import type { CJSSession } from '@/types/user'

/** Garde de rôle — fail-closed. Retourne la session (acteur d'audit). */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

// Non exporté : un fichier 'use server' ne peut exporter que des fonctions async.
const evenementSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis').max(200),
  description: z.string().trim().min(1, 'Description requise'),
  type: z.nativeEnum(TypeEvenement),
  statut: z.nativeEnum(StatutEvenement).optional().default(StatutEvenement.a_venir),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date().optional().nullable(),
  lieu: z.string().trim().min(1, 'Lieu requis').max(200),
  // GUIC-474 — rattachement à un centre (requis pour les cours/sessions au centre).
  centreId: z.string().trim().optional().nullable(),
  capaciteMax: z.coerce.number().int().positive().optional().nullable(),
  estGratuit: z.boolean().optional().default(true),
})
type EvenementInput = z.input<typeof evenementSchema>

const idSchema = z.string().min(1, 'id requis')

function revalidate() {
  revalidatePath('/admin/evenements')
}

function toData(d: z.output<typeof evenementSchema>) {
  return {
    titre: d.titre,
    // GUIC-506 — corps riche : sanitisation serveur (liste blanche, anti-XSS).
    description: sanitizeRichHtml(d.description),
    type: d.type,
    statut: d.statut,
    dateDebut: d.dateDebut,
    dateFin: d.dateFin ?? null,
    lieu: d.lieu,
    centreId: d.centreId?.trim() || null,
    capaciteMax: d.capaciteMax ?? null,
    estGratuit: d.estGratuit,
  }
}

/** Vérifie que le centre existe (si fourni). */
async function assertCentre(centreId: string | null | undefined): Promise<void> {
  if (!centreId) return
  const c = await prisma.centre.findUnique({ where: { id: centreId }, select: { id: true } })
  if (!c) throw new Error('CENTRE_INTROUVABLE')
}

/** Créer un événement (admin). */
export async function creerEvenement(input: EvenementInput): Promise<{ id: string }> {
  await assertAdmin()
  const data = evenementSchema.parse(input)
  await assertCentre(data.centreId)
  const e = await prisma.evenement.create({ data: toData(data), select: { id: true } })
  revalidate()
  return e
}

/** Modifier un événement (admin). */
export async function modifierEvenement(id: string, input: EvenementInput): Promise<{ ok: true }> {
  await assertAdmin()
  const eid = idSchema.parse(id)
  const data = evenementSchema.parse(input)
  await assertCentre(data.centreId)
  await prisma.evenement.update({ where: { id: eid }, data: toData(data) })
  revalidate()
  return { ok: true }
}

/** Supprimer un événement (admin). Refuse si des inscriptions existent. */
export async function supprimerEvenement(id: string): Promise<{ ok: true }> {
  await assertAdmin()
  const eid = idSchema.parse(id)
  const counts = await prisma.evenement.findUnique({
    where: { id: eid },
    select: { _count: { select: { inscriptions: true } } },
  })
  if (counts && counts._count.inscriptions > 0) {
    throw new Error('EVENEMENT_AVEC_INSCRITS')
  }
  await prisma.evenement.delete({ where: { id: eid } })
  revalidate()
  return { ok: true }
}

/**
 * GUIC-474 — Marquer (ou retirer) la présence d'un jeune à un événement.
 * `present=true` → upsert `present` (walk-in créé si non inscrit) ; `present=false`
 * → repasse `inscrit` (correction). Alimente le taux de présence (GUIC-472).
 */
export async function marquerPresenceEvenement(
  evenementId: string,
  cjsUid: string,
  present: boolean,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const eid = idSchema.parse(evenementId)
  const uid = idSchema.parse(cjsUid)

  if (present) {
    await prisma.inscriptionEvenement.upsert({
      where: { cjsUid_evenementId: { cjsUid: uid, evenementId: eid } },
      create: { cjsUid: uid, evenementId: eid, statut: 'present' },
      update: { statut: 'present' },
    })
  } else {
    await prisma.inscriptionEvenement.updateMany({
      where: { cjsUid: uid, evenementId: eid },
      data: { statut: 'inscrit' },
    })
  }

  await recordAudit(session.cjsUid, 'evenement.presence', {
    targetType: 'evenement',
    targetId: eid,
    meta: { present, via: 'admin' },
  })
  revalidatePath(`/admin/evenements/${eid}`)
  return { ok: true }
}

/**
 * GUIC-477 — Validation des publications conseiller (statut `en_relecture`).
 * Approuver → `a_venir` (publié) ; refuser → `refuse` (masqué du public).
 */
export async function validerPublication(id: string): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const eid = idSchema.parse(id)
  const e = await prisma.evenement.findUnique({ where: { id: eid }, select: { statut: true } })
  if (!e || e.statut !== StatutEvenement.en_relecture) throw new Error('PUBLICATION_NON_EN_RELECTURE')
  await prisma.evenement.update({ where: { id: eid }, data: { statut: StatutEvenement.a_venir } })
  await recordAudit(session.cjsUid, 'evenement.validation', { targetType: 'evenement', targetId: eid, meta: { decision: 'valide' } })
  revalidate()
  revalidatePath('/conseiller/publications')
  return { ok: true }
}

export async function refuserPublication(id: string): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const eid = idSchema.parse(id)
  const e = await prisma.evenement.findUnique({ where: { id: eid }, select: { statut: true } })
  if (!e || e.statut !== StatutEvenement.en_relecture) throw new Error('PUBLICATION_NON_EN_RELECTURE')
  await prisma.evenement.update({ where: { id: eid }, data: { statut: StatutEvenement.refuse } })
  await recordAudit(session.cjsUid, 'evenement.validation', { targetType: 'evenement', targetId: eid, meta: { decision: 'refuse' } })
  revalidate()
  revalidatePath('/conseiller/publications')
  return { ok: true }
}
