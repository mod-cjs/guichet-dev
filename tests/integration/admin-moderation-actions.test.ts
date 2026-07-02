/**
 * @jest-environment node
 *
 * GUIC-462 — Server actions de modération admin (Approuver / Rejeter).
 * INTÉGRATION RÉELLE : prisma N'EST PAS mocké → écrit dans la vraie MariaDB
 * (cf .agent_context/specs/quality-charter.md §3). Auth + next/cache = bords mockés.
 * Pré-requis : DATABASE_URL vers la base de test locale (docker gj-maria, port 3307).
 */
import { prisma } from '@/lib/prisma'

// La 1re requête ouvre la connexion (cold start) — lente sur la MariaDB locale.
// Timeout généreux pour un test d'intégration déterministe (pas de faux-rouge flaky).
jest.setTimeout(30000)

// Bords (non-DB) mockés : session + revalidation.
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
const mockRevalidate = jest.fn()
jest.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => mockRevalidate(...a) }))

import { approuverOpportunite, rejeterOpportunite } from '@/app/admin/opportunites/actions'

const base = {
  cjsUid: 'test-admin', nom: 'Test', prenom: 'Admin', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}
const ADMIN = { ...base, roles: ['admin'] }
const JEUNE = { ...base, roles: ['beneficiaire'] }

let oppId: string

async function makeBrouillon(): Promise<string> {
  const o = await prisma.opportunite.create({
    data: {
      slug: `test-moderation-${Date.now()}-${Math.floor(performance.now())}`,
      titre: 'Opportunité test modération',
      description: 'Fixture intégration GUIC-462.',
      type: 'Bourse',
      organisation: 'Org Test',
      domaine: 'Entrepreneuriat',
      statut: 'brouillon',
    },
    select: { id: true },
  })
  return o.id
}

beforeEach(async () => {
  oppId = await makeBrouillon()
})
afterEach(async () => {
  await prisma.opportunite.deleteMany({ where: { id: oppId } })
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-462 — modération approuver/rejeter (DB réelle)', () => {
  it('given admin + brouillon, when approuver, then statut=publiee en base', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await approuverOpportunite(oppId)
    const row = await prisma.opportunite.findUnique({ where: { id: oppId }, select: { statut: true } })
    expect(row?.statut).toBe('publiee')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/opportunites')
  })

  it('given admin + brouillon, when rejeter, then statut=archivee en base', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await rejeterOpportunite(oppId)
    const row = await prisma.opportunite.findUnique({ where: { id: oppId }, select: { statut: true } })
    expect(row?.statut).toBe('archivee')
  })

  // GUIC-471 — la décision de modération est tracée SUR l'offre (moderePar/modereLe/motifRejet).
  it('given admin, when approuver, then trace moderePar/modereLe et motifRejet=null', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await approuverOpportunite(oppId)
    const row = await prisma.opportunite.findUnique({
      where: { id: oppId },
      select: { moderePar: true, modereLe: true, motifRejet: true },
    })
    expect(row?.moderePar).toBe('test-admin')
    expect(row?.modereLe).toBeInstanceOf(Date)
    expect(row?.motifRejet).toBeNull()
  })

  it('given admin + motif, when rejeter, then motifRejet persisté sur l\'offre', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await rejeterOpportunite(oppId, 'Hors charte éditoriale')
    const row = await prisma.opportunite.findUnique({
      where: { id: oppId },
      select: { motifRejet: true, moderePar: true },
    })
    expect(row?.motifRejet).toBe('Hors charte éditoriale')
    expect(row?.moderePar).toBe('test-admin')
  })

  it('given NON-admin, when approuver, then refus (throw) ET row inchangée (brouillon)', async () => {
    mockGetSession.mockResolvedValue(JEUNE)
    await expect(approuverOpportunite(oppId)).rejects.toThrow(/FORBIDDEN/)
    const row = await prisma.opportunite.findUnique({ where: { id: oppId }, select: { statut: true } })
    expect(row?.statut).toBe('brouillon')
  })

  it('given session absente, when approuver, then refus', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(approuverOpportunite(oppId)).rejects.toThrow(/FORBIDDEN/)
  })

  it('given une opp DÉJÀ publiee (pas brouillon), when approuver, then refus (pas de re-modération)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await prisma.opportunite.update({ where: { id: oppId }, data: { statut: 'publiee' } })
    await expect(approuverOpportunite(oppId)).rejects.toThrow(/NOT_FOUND_OR_NOT_BROUILLON/)
  })
})
