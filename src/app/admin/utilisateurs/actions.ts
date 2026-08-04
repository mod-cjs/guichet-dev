'use server'

/**
 * GUIC-526 — Actions admin « Rôles & rattachements » (fiche utilisateur).
 *
 * L'admin PROVISIONNE les périmètres (supervision, cf feedback_roles_candidatures) :
 * - rattacher/retirer un conseiller à un centre (`AgentCentre`)
 * - lier/créer l'organisation d'un recruteur (`Organisation.cjsUid`)
 * Le RÔLE lui-même s'attribue dans l'admin SSO (claim `cjs_roles`) — jamais ici.
 *
 * Toute action est journalisée via `recordAudit` (trail admin).
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { RoleAgent } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'

export interface ActionResult {
  ok: boolean
  /** Code d'erreur stable pour l'UI : FORBIDDEN | VALIDATION | DEJA_RATTACHE | INTROUVABLE | ERREUR */
  error?: string
}

/** Garde de rôle — fail-closed, sans throw (résultat consommable par l'UI). */
async function requireAdmin(): Promise<{ cjsUid: string } | null> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return null
  return { cjsUid: session.cjsUid }
}

function prismaCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined
}

function revalidate(cjsUid: string) {
  revalidatePath('/admin/utilisateurs')
  revalidatePath(`/admin/utilisateurs/${cjsUid}`)
}

const rattachementSchema = z.object({
  cjsUid: z.string().uuid(),
  centreId: z.string().min(1),
  role: z.nativeEnum(RoleAgent).default(RoleAgent.conseiller),
})

export async function ajouterRattachementCentre(input: {
  cjsUid: string
  centreId: string
  role?: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsed = rattachementSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'VALIDATION' }

  try {
    await prisma.agentCentre.create({
      data: {
        cjsUid: parsed.data.cjsUid,
        centreId: parsed.data.centreId,
        role: parsed.data.role,
      },
    })
  } catch (e) {
    // @@unique([cjsUid, centreId]) — déjà rattaché à ce centre.
    if (prismaCode(e) === 'P2002') return { ok: false, error: 'DEJA_RATTACHE' }
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.rattachement_centre.ajout', {
    targetType: 'utilisateur',
    targetId: parsed.data.cjsUid,
    meta: { centreId: parsed.data.centreId, role: parsed.data.role },
  })
  revalidate(parsed.data.cjsUid)
  return { ok: true }
}

export async function retirerRattachementCentre(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsedId = z.string().min(1).safeParse(id)
  if (!parsedId.success) return { ok: false, error: 'VALIDATION' }

  let deleted: { id: string; cjsUid: string }
  try {
    deleted = await prisma.agentCentre.delete({ where: { id: parsedId.data } })
  } catch (e) {
    if (prismaCode(e) === 'P2025') return { ok: false, error: 'INTROUVABLE' }
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.rattachement_centre.retrait', {
    targetType: 'utilisateur',
    targetId: deleted.cjsUid,
    meta: { agentCentreId: deleted.id },
  })
  revalidate(deleted.cjsUid)
  return { ok: true }
}

const liaisonSchema = z.object({
  cjsUid: z.string().uuid(),
  organisationId: z.string().min(1),
})

export async function lierOrganisation(input: {
  cjsUid: string
  organisationId: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsed = liaisonSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'VALIDATION' }

  try {
    await prisma.organisation.update({
      where: { id: parsed.data.organisationId },
      data: { cjsUid: parsed.data.cjsUid },
    })
  } catch (e) {
    if (prismaCode(e) === 'P2025') return { ok: false, error: 'INTROUVABLE' }
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.organisation.liaison', {
    targetType: 'organisation',
    targetId: parsed.data.organisationId,
    meta: { cjsUid: parsed.data.cjsUid },
  })
  revalidate(parsed.data.cjsUid)
  return { ok: true }
}

const creationSchema = z.object({
  cjsUid: z.string().uuid(),
  nom: z.string().trim().min(2, 'Nom requis').max(200),
})

export async function creerOrganisationPourRecruteur(input: {
  cjsUid: string
  nom: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsed = creationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'VALIDATION' }

  let created: { id: string }
  try {
    created = await prisma.organisation.create({
      data: { cjsUid: parsed.data.cjsUid, nom: parsed.data.nom },
    })
  } catch {
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.organisation.creation', {
    targetType: 'organisation',
    targetId: created.id,
    meta: { cjsUid: parsed.data.cjsUid, nom: parsed.data.nom },
  })
  revalidate(parsed.data.cjsUid)
  return { ok: true }
}

// ─── PR-C (GUIC-701) — Statut, anonymisation (CDP), message groupé ─────────────
import { sendResendEmail } from '@/lib/email/resend'

/** Suspendre / réactiver un compte (bascule actif↔inactif). Refuse si anonymisé. */
export async function changerStatutUtilisateur(cjsUid: string, statut: 'actif' | 'inactif'): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }
  const u = await prisma.utilisateur.findUnique({ where: { cjsUid }, select: { statut: true } })
  if (!u) return { ok: false, error: 'INTROUVABLE' }
  if (u.statut === 'anonymise') return { ok: false, error: 'ANONYMISE' }
  await prisma.utilisateur.update({ where: { cjsUid }, data: { statut } })
  await recordAudit(admin.cjsUid, 'admin.utilisateur.statut', { targetType: 'utilisateur', targetId: cjsUid, meta: { statut } })
  revalidate(cjsUid)
  return { ok: true }
}

/**
 * Anonymiser (droit à l'effacement, CDP) — IRRÉVERSIBLE. Efface les PII, passe `anonymise`,
 * conserve cjs_uid (clé inter-plateformes) et agrégats non-nominatifs. Journalisé.
 */
export async function anonymiserUtilisateur(cjsUid: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }
  const u = await prisma.utilisateur.findUnique({ where: { cjsUid }, select: { statut: true } })
  if (!u) return { ok: false, error: 'INTROUVABLE' }
  if (u.statut === 'anonymise') return { ok: false, error: 'DEJA_ANONYMISE' }
  await prisma.$transaction([
    prisma.utilisateur.update({
      where: { cjsUid },
      data: { statut: 'anonymise', nom: '—', prenom: '—', email: null, telephone: null, dateNaissance: null, deletedAt: new Date() },
    }),
    prisma.profilJeune.updateMany({ where: { cjsUid }, data: { biographie: null, photoUrl: null, cvUrl: null, competences: undefined, domainesInteret: undefined } }),
  ])
  await recordAudit(admin.cjsUid, 'admin.utilisateur.anonymisation', { targetType: 'utilisateur', targetId: cjsUid, meta: { droitEffacement: true } })
  revalidate(cjsUid)
  return { ok: true }
}

export type CanalMessage = 'in_app' | 'email'

/** Message groupé aux utilisateurs sélectionnés (in-app + e-mail). Skip sans contact. Journalisé. */
export async function messageGroupe(cjsUids: string[], opts: { canaux: CanalMessage[]; objet: string; message: string }): Promise<{ envoyes: number; ignores: number }> {
  const admin = await requireAdmin()
  if (!admin) throw new Error('FORBIDDEN')
  if (cjsUids.length === 0 || opts.canaux.length === 0) return { envoyes: 0, ignores: 0 }
  const titre = opts.objet.trim() || 'Message de l’administration'
  const contenu = opts.message.trim()
  const users = await prisma.utilisateur.findMany({ where: { cjsUid: { in: cjsUids }, statut: { not: 'anonymise' } }, select: { cjsUid: true, email: true } })
  let envoyes = 0, ignores = 0
  for (const u of users) {
    let delivered = false
    if (opts.canaux.includes('in_app')) {
      try { await prisma.notification.create({ data: { cjsUid: u.cjsUid, type: 'System', titre, contenu, iconName: 'bell' } }); delivered = true } catch { /* non bloquant */ }
    }
    if (opts.canaux.includes('email') && u.email) {
      try { await sendResendEmail(u.email, titre, `<p>${contenu}</p>`); delivered = true } catch { /* creds/env — non bloquant */ }
    }
    if (delivered) envoyes++; else ignores++
  }
  await recordAudit(admin.cjsUid, 'admin.utilisateur.message_groupe', { targetType: 'utilisateur', meta: { destinataires: cjsUids.length, canaux: opts.canaux } })
  return { envoyes, ignores }
}
