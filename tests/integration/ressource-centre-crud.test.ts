/**
 * @jest-environment node
 *
 * GUIC-473 — Server actions CRUD RessourceCentre.
 * INTÉGRATION RÉELLE : prisma non mické → écrit dans la vraie MariaDB (port 3307).
 * Auth + next/cache = bords mockés. Pré-requis : DATABASE_URL + au moins 1 centre seedé.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import {
  creerRessourceCentre,
  modifierRessourceCentre,
  supprimerRessourceCentre,
} from '@/app/admin/centres/ressources-actions'

const ADMIN = {
  cjsUid: 'test-admin-rc', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, roles: ['admin'], accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}

let centreId: string
let createdId: string | null = null

beforeAll(async () => {
  const centre = await prisma.centre.findFirst({ select: { id: true } })
  if (!centre) throw new Error('Aucun centre seedé en base de test')
  centreId = centre.id
})
afterEach(async () => {
  if (createdId) {
    await prisma.ressourceCentre.delete({ where: { id: createdId } }).catch(() => {})
    createdId = null
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-473 — CRUD RessourceCentre (DB réelle)', () => {
  it('creer → modifier → supprimer une salle de bout en bout', async () => {
    mockGetSession.mockResolvedValue(ADMIN)

    const { id } = await creerRessourceCentre(centreId, {
      type: 'Salle',
      nom: 'Salle intégration test',
      capacite: 15,
      capaciteUnit: 'personnes',
      dureeMinCreneauMin: 45,
      requiresJustif: false,
      estActive: true,
    })
    createdId = id

    const created = await prisma.ressourceCentre.findUnique({
      where: { id },
      select: { centreId: true, nom: true, capacite: true, type: true },
    })
    expect(created?.centreId).toBe(centreId)
    expect(created?.capacite).toBe(15)
    expect(created?.type).toBe('Salle')

    await modifierRessourceCentre(id, {
      type: 'Salle',
      nom: 'Salle intégration test (éditée)',
      capacite: 30,
      dureeMinCreneauMin: 60,
      requiresJustif: true,
      estActive: true,
    })
    const updated = await prisma.ressourceCentre.findUnique({ where: { id }, select: { nom: true, capacite: true } })
    expect(updated?.nom).toBe('Salle intégration test (éditée)')
    expect(updated?.capacite).toBe(30)

    await supprimerRessourceCentre(id)
    const gone = await prisma.ressourceCentre.findUnique({ where: { id } })
    expect(gone).toBeNull()
    createdId = null
  })
})
