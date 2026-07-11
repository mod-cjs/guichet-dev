/**
 * @jest-environment node
 *
 * GUIC-512 — Loader du dashboard recruteur. Prisma mické : vérifie l'agrégation
 * des KPI (offres actives, candidatures reçues, à examiner) et le mapping listes.
 */
// GUIC-538 — mock Prisma PARTAGÉ : toute méthode est auto-mockée, ce test ne peut
// plus se désynchroniser quand le loader gagne un nouvel appel Prisma.
jest.mock('@/lib/prisma')

import { prisma } from '@/lib/prisma'
import { getRecruteurDashboard } from '@/lib/loaders/recruteur'

const mockPrisma = prisma as unknown as {
  opportunite: { count: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock }
  candidature: { count: jest.Mock; findMany: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.opportunite.count.mockResolvedValue(3)
  mockPrisma.opportunite.aggregate.mockResolvedValue({ _sum: { vues: 1248 } })
  // 3 appels count : reçues (total) · cette semaine · à examiner (pipelineStage Recue).
  mockPrisma.candidature.count.mockResolvedValueOnce(37).mockResolvedValueOnce(12).mockResolvedValueOnce(6)
  mockPrisma.opportunite.findMany.mockResolvedValue([
    { id: 'o1', titre: 'Stage Data', statut: 'publiee', vues: 1248, _count: { candidatures: 23 } },
  ])
  mockPrisma.candidature.findMany.mockResolvedValue([
    { id: 'c1', statut: 'En_attente', utilisateur: { prenom: 'Fatou', nom: 'Ba' }, opportunite: { titre: 'Stage Data' }, scoreAdequation: 82, soumiseA: new Date('2026-07-01T10:00:00.000Z') },
  ])
})

describe('GUIC-512 — getRecruteurDashboard', () => {
  it('agrège les KPI depuis la base', async () => {
    const d = await getRecruteurDashboard('rec-1', 'org-1')
    expect(d.offresActives).toBe(3)
    expect(d.candidaturesRecues).toBe(37)
    expect(d.aExaminer).toBe(6)
    expect(d.offres[0]).toEqual({ id: 'o1', titre: 'Stage Data', statut: 'publiee', candidatures: 23, vues: 1248 })
    expect(d.aExaminerListe[0]).toEqual({ id: 'c1', prenom: 'Fatou', nom: 'Ba', statut: 'En_attente', offreTitre: 'Stage Data', score: 82, soumiseA: '2026-07-01T10:00:00.000Z' })
  })

  it('filtre les offres par recruteurUid OU organisationId', async () => {
    await getRecruteurDashboard('rec-1', 'org-1')
    const where = mockPrisma.opportunite.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([{ recruteurUid: 'rec-1' }, { organisationId: 'org-1' }])
    expect(where.deletedAt).toBeNull()
  })
})
