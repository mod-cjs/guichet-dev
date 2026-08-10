/**
 * @jest-environment node
 *
 * GUIC-473 — Server actions CRUD RessourceCentre.
 * INTÉGRATION RÉELLE : prisma non mické → écrit dans la vraie MariaDB (port 3307).
 * Auth + next/cache = bords mockés. Seul pré-requis : DATABASE_URL.
 *
 * GUIC-674 — Le test créait ici sa dépendance à un centre « seedé » quelque
 * part. Sur une base vierge (la CI, ou tout poste neuf) il échouait avant la
 * première assertion. Il fabrique désormais son propre centre et le retire :
 * un test qui dépend de lignes qu'il n'a pas posées est vert par chance.
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
  const centre = await prisma.centre.create({
    data: {
      nom: 'Centre fixture GUIC-473',
      region: 'Dakar',
      adresse: 'Fixture intégration — supprimé en fin de suite',
      latitude: 14.6928,
      longitude: -17.4467,
      telephone: '+221338000473',
      responsable: 'Fixture',
    },
    select: { id: true },
  })
  centreId = centre.id
})
afterEach(async () => {
  if (createdId) {
    await prisma.ressourceCentre.delete({ where: { id: createdId } }).catch(() => {})
    createdId = null
  }
})
afterAll(async () => {
  // Les ressources d'abord : FK vers le centre.
  await prisma.ressourceCentre.deleteMany({ where: { centreId } }).catch(() => {})
  await prisma.centre.delete({ where: { id: centreId } }).catch(() => {})
  await prisma.$disconnect()
})

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
