'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import {
  createLivre, updateLivre, deleteLivre,
  createExemplaire, updateExemplaire, deleteExemplaire,
  BiblioDomainError,
} from '@/lib/bibliotheque/service'

export interface BiblioActionResult { ok: boolean; error?: string }

async function assertAdmin(): Promise<boolean> {
  const session = await getSession()
  return Boolean(session && isAdminRole(session.roles))
}

function revalidate(centreId: string) {
  revalidatePath(`/admin/centres/${centreId}`)
}

function mapErr(e: unknown): string {
  if (e instanceof BiblioDomainError) return e.code
  // Contrainte d'unicité du code-barres (Exemplaire.codeBarre @unique).
  if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') return 'DUPLICATE_CODE_BARRE'
  return 'ERREUR'
}

const livreSchema = z.object({
  titre: z.string().trim().min(1).max(300),
  auteur: z.string().trim().min(1).max(200),
  theme: z.string().trim().min(1).max(120),
  isbn: z.string().trim().max(20).optional().nullable(),
  niveau: z.string().trim().max(60).optional().nullable(),
  langue: z.string().trim().max(40).optional(),
  resume: z.string().trim().optional().nullable(),
  couvertureUrl: z.string().trim().max(500).optional().nullable(),
})

const exemplaireSchema = z.object({
  codeBarre: z.string().trim().min(1).max(64),
  rayon: z.string().trim().min(1).max(40),
  etagere: z.string().trim().min(1).max(40),
  position: z.string().trim().min(1).max(40),
})

/** Créer un livre au catalogue, avec optionnellement un 1er exemplaire dans CE centre. */
export async function creerLivreCentre(
  centreId: string,
  livre: z.input<typeof livreSchema>,
  exemplaire?: z.input<typeof exemplaireSchema>,
): Promise<BiblioActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: 'FORBIDDEN' }
  const pl = livreSchema.safeParse(livre)
  if (!pl.success) return { ok: false, error: 'VALIDATION' }
  try {
    const { id: livreId } = await createLivre(pl.data)
    if (exemplaire) {
      const pe = exemplaireSchema.safeParse(exemplaire)
      if (!pe.success) return { ok: false, error: 'VALIDATION_EXEMPLAIRE' }
      await createExemplaire({ livreId, centreId, ...pe.data })
    }
    revalidate(centreId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapErr(e) }
  }
}

/** Modifier un livre du catalogue. */
export async function modifierLivreCentre(centreId: string, livreId: string, livre: z.input<typeof livreSchema>): Promise<BiblioActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: 'FORBIDDEN' }
  const pl = livreSchema.safeParse(livre)
  if (!pl.success) return { ok: false, error: 'VALIDATION' }
  try {
    await updateLivre(livreId, pl.data)
    revalidate(centreId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapErr(e) }
  }
}

/** Supprimer un livre (et ses exemplaires en cascade). */
export async function supprimerLivreCentre(centreId: string, livreId: string): Promise<BiblioActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: 'FORBIDDEN' }
  try {
    await deleteLivre(livreId)
    revalidate(centreId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapErr(e) }
  }
}

/** Ajouter un exemplaire d'un livre au fonds de CE centre. */
export async function ajouterExemplaireCentre(centreId: string, livreId: string, exemplaire: z.input<typeof exemplaireSchema>): Promise<BiblioActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: 'FORBIDDEN' }
  const pe = exemplaireSchema.safeParse(exemplaire)
  if (!pe.success) return { ok: false, error: 'VALIDATION' }
  try {
    await createExemplaire({ livreId, centreId, ...pe.data })
    revalidate(centreId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapErr(e) }
  }
}

/** Modifier l'emplacement / statut (disponible|indisponible) d'un exemplaire. Admin cross-centres. */
export async function modifierExemplaireCentre(
  centreId: string,
  exemplaireId: string,
  input: { rayon?: string; etagere?: string; position?: string; statut?: 'disponible' | 'indisponible' },
): Promise<BiblioActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: 'FORBIDDEN' }
  try {
    await updateExemplaire(exemplaireId, null, input)
    revalidate(centreId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapErr(e) }
  }
}

/** Retirer un exemplaire du fonds. Admin cross-centres. */
export async function supprimerExemplaireCentre(centreId: string, exemplaireId: string): Promise<BiblioActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: 'FORBIDDEN' }
  try {
    await deleteExemplaire(exemplaireId, null)
    revalidate(centreId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapErr(e) }
  }
}
