'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { Domaine, Region } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
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

/** Modifier les champs éditables d'un partenaire. */
export async function modifierPartenaire(id: string, input: PartenaireInput): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const pid = idSchema.parse(id)
  const data = partenaireSchema.parse(input)
  await prisma.organisation.update({
    where: { id: pid },
    data: {
      nom: data.nom,
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
