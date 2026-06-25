/**
 * @jest-environment node
 *
 * G1 (audit croisé Lot 11) — Server actions CRUD Types d'opportunité (admin).
 * INTÉGRATION RÉELLE MariaDB (quality-charter §3). Auth/cache mockés.
 * Pré-requis : DATABASE_URL vers la base de test locale (docker gj-maria 3307).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
const mockRevalidate = jest.fn()
jest.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => mockRevalidate(...a) }))

import {
  creerType,
  modifierType,
  basculerActifType,
  supprimerType,
} from '@/app/admin/types-opportunite/actions'

const base = {
  cjsUid: 'test-admin', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}
const ADMIN = { ...base, roles: ['admin'] }
const JEUNE = { ...base, roles: ['beneficiaire'] }

const SLUG = 'test_crud_type_g1'
const valid = {
  libelle: 'Type Test CRUD',
  slug: SLUG,
  actionLabel: 'Postuler',
  requiresFileUpload: true,
  fileLabel: 'CV (PDF)',
  decisionAuthority: 'recruteur',
  actif: true,
  ordre: 99,
}

async function cleanup() {
  await prisma.opportuniteType.deleteMany({ where: { slug: { startsWith: 'test_crud_type_g1' } } })
}
beforeEach(cleanup)
afterEach(cleanup)
afterAll(async () => { await prisma.$disconnect() })

describe('G1 — CRUD types d’opportunité (DB réelle)', () => {
  it('given admin + données valides, when creer, then le type existe en base', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const t = await creerType(valid)
    const row = await prisma.opportuniteType.findUnique({ where: { id: t.id } })
    expect(row?.libelle).toBe('Type Test CRUD')
    expect(row?.slug).toBe(SLUG)
    expect(row?.requiresFileUpload).toBe(true)
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/types-opportunite')
  })

  it('given un type, when modifier, then les champs changent mais PAS le slug', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const t = await creerType(valid)
    await modifierType(t.id, {
      libelle: 'Type Renommé', actionLabel: 'S’inscrire',
      requiresFileUpload: false, fileLabel: null, decisionAuthority: 'auto',
      actif: true, ordre: 5,
    })
    const row = await prisma.opportuniteType.findUnique({ where: { id: t.id } })
    expect(row?.libelle).toBe('Type Renommé')
    expect(row?.actionLabel).toBe('S’inscrire')
    expect(row?.requiresFileUpload).toBe(false)
    expect(row?.slug).toBe(SLUG) // slug immuable
  })

  it('given un type, when basculerActif, then actif est inversé', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const t = await creerType(valid)
    await basculerActifType(t.id, false)
    expect((await prisma.opportuniteType.findUnique({ where: { id: t.id } }))?.actif).toBe(false)
  })

  it('given un type VIDE, when supprimer, then la row disparaît', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const t = await creerType(valid)
    await supprimerType(t.id)
    expect(await prisma.opportuniteType.findUnique({ where: { id: t.id } })).toBeNull()
  })

  it('given un slug déjà pris, when creer, then refus SLUG_EXISTANT', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await creerType(valid)
    await expect(creerType(valid)).rejects.toThrow(/SLUG_EXISTANT/)
  })

  it('given NON-admin, when creer, then refus ET rien créé', async () => {
    mockGetSession.mockResolvedValue(JEUNE)
    await expect(creerType(valid)).rejects.toThrow(/FORBIDDEN/)
    expect(await prisma.opportuniteType.findUnique({ where: { slug: SLUG } })).toBeNull()
  })

  it('given admin + slug invalide (majuscules), when creer, then rejet Zod', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await expect(creerType({ ...valid, slug: 'Test_Crud_Type_G1_BAD' })).rejects.toThrow()
  })

  it('given un type AVEC opportunités, when supprimer, then refus TYPE_NON_VIDE (row conservée)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const used = await prisma.opportuniteType.findFirst({
      where: { opportunites: { some: {} } },
      select: { id: true },
    })
    if (!used) {
      console.warn('AUCUN type rattaché à des opportunités — assertion TYPE_NON_VIDE non exécutée')
      return
    }
    await expect(supprimerType(used.id)).rejects.toThrow(/TYPE_NON_VIDE/)
    expect(await prisma.opportuniteType.findUnique({ where: { id: used.id } })).not.toBeNull()
  })
})
