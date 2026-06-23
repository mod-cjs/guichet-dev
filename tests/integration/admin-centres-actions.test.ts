/**
 * @jest-environment node
 *
 * GUIC-464 — Server actions CRUD Centres (admin). INTÉGRATION RÉELLE MariaDB
 * (quality-charter §3). Auth/cache mockés.
 * Pré-requis : DATABASE_URL vers la base de test locale (docker gj-maria 3307).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
const mockRevalidate = jest.fn()
jest.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => mockRevalidate(...a) }))

import { creerCentre, modifierCentre, supprimerCentre } from '@/app/admin/centres/actions'

const base = {
  cjsUid: 'test-admin', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}
const ADMIN = { ...base, roles: ['admin'] }
const JEUNE = { ...base, roles: ['beneficiaire'] }

const valid = {
  nom: 'Centre Test CRUD',
  region: 'Dakar' as const,
  adresse: '1 rue Test, Dakar',
  latitude: 14.7,
  longitude: -17.45,
  telephone: '+221770000000',
  responsable: 'Test Responsable',
  ville: 'Dakar',
}

const created: string[] = []
afterEach(async () => {
  if (created.length) {
    await prisma.centre.deleteMany({ where: { id: { in: created } } })
    created.length = 0
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-464 — CRUD centres (DB réelle)', () => {
  it('given admin + données valides, when creer, then le centre existe en base', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const c = await creerCentre(valid)
    created.push(c.id)
    const row = await prisma.centre.findUnique({ where: { id: c.id } })
    expect(row?.nom).toBe('Centre Test CRUD')
    expect(row?.region).toBe('Dakar')
    expect(row?.latitude).toBeCloseTo(14.7)
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/centres')
  })

  it('given un centre, when modifier, then les champs changent', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const c = await creerCentre(valid); created.push(c.id)
    await modifierCentre(c.id, { ...valid, nom: 'Centre Renommé', region: 'Thies' })
    const row = await prisma.centre.findUnique({ where: { id: c.id } })
    expect(row?.nom).toBe('Centre Renommé')
    expect(row?.region).toBe('Thies')
  })

  it('given un centre VIDE, when supprimer, then la row disparaît', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const c = await creerCentre(valid)
    await supprimerCentre(c.id)
    expect(await prisma.centre.findUnique({ where: { id: c.id } })).toBeNull()
  })

  it('given NON-admin, when creer, then refus ET rien créé', async () => {
    mockGetSession.mockResolvedValue(JEUNE)
    const before = await prisma.centre.count()
    await expect(creerCentre(valid)).rejects.toThrow(/FORBIDDEN/)
    expect(await prisma.centre.count()).toBe(before)
  })

  it('given admin + nom vide, when creer, then rejet Zod', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await expect(creerCentre({ ...valid, nom: '' })).rejects.toThrow()
  })

  it('given admin + latitude hors bornes, when creer, then rejet Zod', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await expect(creerCentre({ ...valid, latitude: 999 })).rejects.toThrow()
  })

  it('given un centre AVEC jeunes/agents, when supprimer, then refus CENTRE_NON_VIDE (row conservée)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const nonEmpty = await prisma.centre.findFirst({
      where: { OR: [{ profilsRattaches: { some: {} } }, { agents: { some: {} } }] },
      select: { id: true },
    })
    if (!nonEmpty) {
      console.warn('AUCUN centre non-vide en base — assertion CENTRE_NON_VIDE non exécutée')
      return
    }
    await expect(supprimerCentre(nonEmpty.id)).rejects.toThrow(/CENTRE_NON_VIDE/)
    expect(await prisma.centre.findUnique({ where: { id: nonEmpty.id } })).not.toBeNull()
  })
})
