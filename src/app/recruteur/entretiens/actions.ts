'use server'

/**
 * GUIC-514 — Actions Entretiens (recruteur).
 * Planification ancrée à une candidature ; garde `recruteur` + ownership (la candidature
 * relève d'une offre du recruteur). Le candidat est notifié (in-app, fail-soft).
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import type { CJSSession } from '@/types/user'
import type { Prisma } from '@prisma/client'

async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

/** Candidature possédée par le recruteur (offre : recruteurUid OU son organisation). */
async function candidatureDuRecruteur(cjsUid: string, candidatureId: string) {
  const org = await prisma.organisation.findFirst({ where: { cjsUid }, select: { id: true } })
  const OR: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: cjsUid }]
  if (org?.id) OR.push({ organisationId: org.id })
  return prisma.candidature.findFirst({
    where: { id: candidatureId, opportunite: { deletedAt: null, OR } },
    select: { id: true, cjsUid: true },
  })
}

const schema = z.object({
  candidatureId: z.string().min(1),
  dateHeure: z.string().min(1),
  mode: z.enum(['Presentiel', 'Visio', 'Telephone']),
  lieu: z.string().trim().max(500).nullish(),
  notes: z.string().trim().max(2000).nullish(),
})
export type PlanifierEntretienInput = z.input<typeof schema>

export async function planifierEntretien(input: PlanifierEntretienInput): Promise<{ id: string }> {
  const session = await assertRecruteur()
  const parsed = schema.parse(input)

  const date = new Date(parsed.dateHeure)
  if (Number.isNaN(date.getTime())) throw new Error('DATE_INVALIDE')

  const cand = await candidatureDuRecruteur(session.cjsUid, parsed.candidatureId)
  if (!cand) throw new Error('FORBIDDEN')

  const ent = await prisma.entretien.create({
    data: {
      candidatureId: cand.id,
      recruteurUid: session.cjsUid,
      candidatUid: cand.cjsUid,
      dateHeure: date,
      mode: parsed.mode,
      lieu: parsed.lieu?.trim() || null,
      notes: parsed.notes?.trim() || null,
    },
    select: { id: true },
  })

  // Notification au candidat (fail-soft) — un entretien planifié est une info importante.
  try {
    const quand = date.toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
    await prisma.notification.create({
      data: {
        cjsUid: cand.cjsUid,
        type: 'System',
        titre: 'Entretien planifié',
        contenu: `Un recruteur a planifié un entretien le ${quand}.`,
        iconName: 'calendar',
        lien: '/jeune/mes-candidatures',
      },
    })
  } catch { /* noop */ }

  await recordAudit(session.cjsUid, 'entretien.plan', { targetType: 'entretien', targetId: ent.id, meta: { candidatureId: cand.id } })
  revalidatePath('/recruteur/entretiens')
  return { id: ent.id }
}

export async function annulerEntretien(id: string): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  const res = await prisma.entretien.updateMany({
    where: { id, recruteurUid: session.cjsUid },
    data: { statut: 'Annule' },
  })
  if (res.count === 0) throw new Error('NOT_FOUND')
  await recordAudit(session.cjsUid, 'entretien.annule', { targetType: 'entretien', targetId: id })
  revalidatePath('/recruteur/entretiens')
  return { ok: true }
}
