/**
 * @jest-environment node
 *
 * GUIC-506/508 — Sanitisation serveur des corps riches sur les CRUD événement & ressource.
 * Le corps `description` doit traverser sanitizeRichHtml avant persistance Prisma.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

const evCreate = jest.fn().mockResolvedValue({ id: 'e-1' })
const ressCreate = jest.fn().mockResolvedValue({ id: 'r-1' })
jest.mock('@/lib/prisma', () => ({
  prisma: {
    evenement: { create: (...a: unknown[]) => evCreate(...a) },
    centre: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
    ressource: { create: (...a: unknown[]) => ressCreate(...a) },
  },
}))

import { getSession } from '@/lib/auth'
import { creerEvenement } from '@/app/admin/evenements/actions'
import { creerRessource } from '@/app/admin/ressources/actions'

const mockSession = getSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue({ cjsUid: 'admin-1', roles: ['admin'] })
})

describe('GUIC-508 — creerEvenement sanitise la description', () => {
  it('retire le script, conserve le corps', async () => {
    await creerEvenement({
      titre: 'Atelier', description: '<p>Bienvenue</p><script>alert(1)</script>',
      type: 'Atelier', dateDebut: new Date('2026-08-01T09:00:00Z'), lieu: 'Dakar',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const data = evCreate.mock.calls[0][0].data
    expect(data.description).toContain('<p>Bienvenue</p>')
    expect(data.description).not.toMatch(/<script/i)
  })
})

describe('GUIC-508 — creerRessource sanitise la description', () => {
  it('retire le handler on*, conserve le corps', async () => {
    await creerRessource({
      titre: 'Guide', description: '<p>Utile</p><img src="https://x.sn/a.png" onerror="alert(1)">',
      type: 'Guide', theme: 'Emploi', url: 'https://cjs.sn/guide.pdf',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const data = ressCreate.mock.calls[0][0].data
    expect(data.description).toContain('<p>Utile</p>')
    expect(data.description).not.toMatch(/onerror/i)
  })
})
