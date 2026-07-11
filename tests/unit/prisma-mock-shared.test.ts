/**
 * @jest-environment node
 *
 * GUIC-538 — Vérifie le mock Prisma PARTAGÉ (`src/lib/__mocks__/prisma.ts`),
 * introduit pour empêcher la désynchronisation des mocks (cause des lots A & B).
 * Sert aussi d'exemple d'adoption pour les futurs tests.
 */
jest.mock('@/lib/prisma')

import { prisma } from '@/lib/prisma'

// Le mock partagé rend n'importe quelle méthode disponible → cast souple pour le test.
const p = prisma as unknown as Record<string, Record<string, jest.Mock>>

beforeEach(() => jest.resetAllMocks())

describe('mock Prisma partagé', () => {
  it('expose toute méthode de modèle comme jest.fn() (plus de « is not a function »)', () => {
    expect(typeof p.opportunite.aggregate).toBe('function')
    expect(typeof p.utilisateur.findUnique).toBe('function')
    // Y compris un modèle/méthode encore jamais utilisé : couverture automatique.
    expect(typeof p.modeleInexistantAujourdhui.methodeFuture).toBe('function')
  })

  it('garde une identité stable entre accès (pour toHaveBeenCalled*)', () => {
    expect(prisma.opportunite.aggregate).toBe(prisma.opportunite.aggregate)
  })

  it('résout les valeurs configurées et enregistre les appels', async () => {
    p.utilisateur.findUnique.mockResolvedValue({ cjsUid: 'u1' })
    await expect(prisma.utilisateur.findUnique({ where: { cjsUid: 'u1' } })).resolves.toEqual({ cjsUid: 'u1' })
    expect(prisma.utilisateur.findUnique).toHaveBeenCalledWith({ where: { cjsUid: 'u1' } })
  })

  it('expose les helpers $-préfixés ($transaction, $queryRaw, …)', async () => {
    expect(typeof prisma.$transaction).toBe('function')
    p.$transaction.mockResolvedValue([])
    await expect(prisma.$transaction([])).resolves.toEqual([])
  })

  it('jest.resetAllMocks() nettoie appels ET implémentations (vrais jest.fn())', async () => {
    p.candidature.count.mockResolvedValue(5)
    await prisma.candidature.count()
    expect(prisma.candidature.count).toHaveBeenCalledTimes(1)

    jest.resetAllMocks()

    expect(prisma.candidature.count).toHaveBeenCalledTimes(0)
    // Implémentation retirée → jest.fn() « nu » renvoie undefined (plus la valeur 5).
    expect(prisma.candidature.count()).toBeUndefined()
  })

  it('ne casse pas les usages « thenable » (await prisma.* sans piège)', () => {
    // `then` ne doit PAS être un jest.fn(), sinon `prisma` deviendrait thenable.
    expect((prisma as { then?: unknown }).then).toBeUndefined()
  })
})
