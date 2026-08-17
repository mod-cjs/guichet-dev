'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { Domaine, Region } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import type { CJSSession } from '@/types/user'

/** Garde de rôle — fail-closed : retourne la session (acteur d'audit). */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

const idSchema = z.string().min(1, 'id requis')

// Champs éditables par l'admin (l'organisation naît côté recruteur/SSO : pas de
// création ni de changement de propriétaire `cjsUid`).
const partenaireSchema = z.object({
  nom: z.string().trim().min(1, 'Nom requis').max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  secteur: z.nativeEnum(Domaine).optional().nullable(),
  region: z.nativeEnum(Region).optional().nullable(),
  adresse: z.string().trim().max(300).optional().nullable(),
  telephone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email('Email invalide').max(255).optional().nullable().or(z.literal('')),
  siteWeb: z.string().trim().max(500).optional().nullable(),
})
type PartenaireInput = z.input<typeof partenaireSchema>

function revalidate(id?: string) {
  revalidatePath('/admin/partenaires')
  if (id) revalidatePath(`/admin/partenaires/${id}`)
}

/** Vérifier / dévérifier un partenaire (bascule `estVerifie`). */
export async function basculerVerifiePartenaire(id: string, verifie: boolean): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const pid = idSchema.parse(id)
  await prisma.organisation.update({ where: { id: pid }, data: { estVerifie: Boolean(verifie) } })
  await recordAudit(session.cjsUid, 'partenaire.verify', {
    targetType: 'organisation',
    targetId: pid,
    meta: { estVerifie: Boolean(verifie) },
  })
  revalidate(pid)
  return { ok: true }
}

/**
 * GUIC-705 — Créer un partenaire AUTONOME (Organisation SANS compte recruteur : `cjsUid` null).
 * Découplage org ≠ compte : un partenaire peut exister avant/sans qu'un recruteur y soit rattaché
 * (partenaire référencé, employeur curé promu). Le rattachement d'un recruteur est une action à part.
 */
export async function creerPartenaire(input: PartenaireInput): Promise<{ id: string }> {
  const session = await assertAdmin()
  const data = partenaireSchema.parse(input)
  const org = await prisma.organisation.create({
    data: {
      nom: data.nom,
      cjsUid: null, // sans compte recruteur
      statut: 'active',
      description: data.description ? sanitizeRichHtml(data.description) || null : null,
      logoUrl: data.logoUrl?.trim() || null,
      secteur: data.secteur ?? null,
      region: data.region ?? null,
      adresse: data.adresse?.trim() || null,
      telephone: data.telephone?.trim() || null,
      email: data.email?.trim() || null,
      siteWeb: data.siteWeb?.trim() || null,
    },
    select: { id: true },
  })
  await recordAudit(session.cjsUid, 'partenaire.create', {
    targetType: 'organisation',
    targetId: org.id,
    meta: { nom: data.nom, sansCompte: true },
  })
  revalidate()
  return { id: org.id }
}

/**
 * GUIC-705 — Suspendre / réactiver un partenaire (levier ORG-LEVEL).
 * `suspendue` masque TOUTES ses offres côté jeune et empêche toute publication — distinct
 * de la désactivation d'un COMPTE recruteur (personne, `changerStatutUtilisateur`).
 */
export async function basculerStatutOrganisation(id: string, statut: 'active' | 'suspendue'): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const pid = idSchema.parse(id)
  await prisma.organisation.update({ where: { id: pid }, data: { statut } })
  await recordAudit(session.cjsUid, 'partenaire.statut', {
    targetType: 'organisation',
    targetId: pid,
    meta: { statut },
  })
  revalidate(pid)
  return { ok: true }
}

/** Modifier les champs éditables d'un partenaire. */
export async function modifierPartenaire(id: string, input: PartenaireInput): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const pid = idSchema.parse(id)
  const data = partenaireSchema.parse(input)
  await prisma.organisation.update({
    where: { id: pid },
    data: {
      nom: data.nom,
      // GUIC-506 — présentation riche (affichée admin/recruteur) : sanitisation serveur.
      description: data.description ? sanitizeRichHtml(data.description) || null : null,
      logoUrl: data.logoUrl?.trim() || null,
      secteur: data.secteur ?? null,
      region: data.region ?? null,
      adresse: data.adresse?.trim() || null,
      telephone: data.telephone?.trim() || null,
      email: data.email?.trim() || null,
      siteWeb: data.siteWeb?.trim() || null,
    },
  })
  await recordAudit(session.cjsUid, 'partenaire.update', {
    targetType: 'organisation',
    targetId: pid,
  })
  revalidate(pid)
  return { ok: true }
}

/**
 * GUIC-705 — Promotion « curation → partenaire » : rattache une offre curée (dont l'employeur
 * n'était qu'un `organisationLibelle` texte) à une Organisation gérable — existante
 * (`organisationId`) ou créée à la volée SANS compte (`nom`). Ne crée jamais en silence :
 * l'admin fournit soit l'id (après suggestion de dédup), soit le nom validé.
 */
const promotionSchema = z
  .object({
    opportuniteId: z.string().min(1),
    organisationId: z.string().min(1).optional(),
    nom: z.string().trim().min(2).max(200).optional(),
  })
  .refine((d) => Boolean(d.organisationId) !== Boolean(d.nom), {
    message: 'Fournir soit organisationId (existant), soit nom (création) — pas les deux.',
  })

export async function promouvoirEmployeur(input: {
  opportuniteId: string
  organisationId?: string
  nom?: string
}): Promise<{ organisationId: string }> {
  const session = await assertAdmin()
  const data = promotionSchema.parse(input)

  let orgId: string
  if (data.organisationId) {
    const existe = await prisma.organisation.findUnique({ where: { id: data.organisationId }, select: { id: true } })
    if (!existe) throw new Error('NOT_FOUND')
    orgId = existe.id
  } else {
    const cree = await prisma.organisation.create({
      data: { nom: data.nom as string, cjsUid: null, statut: 'active' },
      select: { id: true },
    })
    orgId = cree.id
  }

  await prisma.opportunite.update({ where: { id: data.opportuniteId }, data: { organisationId: orgId } })
  await recordAudit(session.cjsUid, 'partenaire.promotion', {
    targetType: 'opportunite',
    targetId: data.opportuniteId,
    meta: { organisationId: orgId, cree: !data.organisationId },
  })
  revalidate(orgId)
  revalidatePath('/admin/opportunites')
  return { organisationId: orgId }
}

/**
 * Activer / suspendre le COMPTE recruteur (personne) propriétaire du partenaire.
 * Partenaire = recruteur : on gère l'organisation ET son compte au même endroit.
 * Bascule `Utilisateur.statut` actif ↔ inactif ; ne touche jamais `anonymise`.
 * Attribution de rôle = SSO (`cjs_auth`).
 */
export async function basculerStatutRecruteur(
  cjsUid: string,
  actif: boolean,
  organisationId?: string,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const uid = idSchema.parse(cjsUid)

  const user = await prisma.utilisateur.findUnique({ where: { cjsUid: uid }, select: { statut: true } })
  if (!user) throw new Error('NOT_FOUND')
  if (user.statut === 'anonymise') throw new Error('COMPTE_ANONYMISE')

  await prisma.utilisateur.update({ where: { cjsUid: uid }, data: { statut: actif ? 'actif' : 'inactif' } })
  await recordAudit(session.cjsUid, 'recruteur.statut', {
    targetType: 'utilisateur',
    targetId: uid,
    meta: { statut: actif ? 'actif' : 'inactif' },
  })
  revalidate(organisationId)
  return { ok: true }
}
