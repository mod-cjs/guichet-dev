/**
 * @jest-environment node
 *
 * GUIC-684 — Rattachement aux programmes depuis l'admin (opportunités, ressources,
 * événements). INTÉGRATION RÉELLE : prisma n'est PAS mocké → vraie MariaDB
 * (quality-charter §3), donc on vérifie les lignes de jonction réellement écrites.
 * Auth / cache mockés.
 *
 * Ce que ça couvre et qu'un test mocké ne couvrirait pas : la PK composite, les
 * cascades, et le fait que le rattachement survit à un rechargement.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { creerRessource, supprimerRessource } from '@/app/admin/ressources/actions'
import { creerEvenement, supprimerEvenement } from '@/app/admin/evenements/actions'

const ADMIN = {
  cjsUid: 'test-admin-684', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
  roles: ['admin'],
}

const ressourceValide = {
  titre: 'Guide rattachement GUIC-684',
  description: 'Fixture intégration.',
  type: 'PDF' as const,
  theme: 'Emploi',
  url: 'https://example.org/guic-684.pdf',
  categorie: null,
  estPublic: true,
}

const evenementValide = {
  titre: 'Atelier rattachement GUIC-684',
  description: 'Fixture intégration.',
  type: 'Atelier' as const,
  dateDebut: new Date('2026-09-01T09:00:00Z'),
  lieu: 'Dakar',
  estGratuit: true,
}

const ressources: string[] = []
const evenements: string[] = []

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(ADMIN)
})

afterEach(async () => {
  if (ressources.length) {
    await prisma.ressource.deleteMany({ where: { id: { in: ressources } } })
    ressources.length = 0
  }
  if (evenements.length) {
    await prisma.evenement.deleteMany({ where: { id: { in: evenements } } })
    evenements.length = 0
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-684 — rattachement aux programmes (ressources)', () => {
  it('écrit les rattachements en jonction, le premier étant principal', async () => {
    const r = await creerRessource({ ...ressourceValide, programmeSlugs: ['yeah', 'edupop'] })
    ressources.push(r.id)

    const liens = await prisma.ressourceProgramme.findMany({
      where: { ressourceId: r.id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(2)
    expect(liens.find((l) => l.programme.slug === 'yeah')?.principal).toBe(true)
    expect(liens.find((l) => l.programme.slug === 'edupop')?.principal).toBe(false)
  })

  it('refuse la création sans programme', async () => {
    await expect(
      creerRessource({ ...ressourceValide, programmeSlugs: [] }),
    ).rejects.toThrow(/PROGRAMME_REQUIS/)
  })

  it('supprime les rattachements en cascade avec la ressource', async () => {
    const r = await creerRessource({ ...ressourceValide, programmeSlugs: ['yjc'] })
    await supprimerRessource(r.id)
    const restants = await prisma.ressourceProgramme.count({ where: { ressourceId: r.id } })
    expect(restants).toBe(0)
  })
})

describe('GUIC-684 — rattachement aux programmes (événements)', () => {
  it('écrit les rattachements en jonction', async () => {
    const e = await creerEvenement({ ...evenementValide, programmeSlugs: ['edupop'] })
    evenements.push(e.id)

    const liens = await prisma.evenementProgramme.findMany({
      where: { evenementId: e.id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(1)
    expect(liens[0].programme.slug).toBe('edupop')
    expect(liens[0].principal).toBe(true)
  })

  it('refuse la création sans programme', async () => {
    await expect(
      creerEvenement({ ...evenementValide, programmeSlugs: [] }),
    ).rejects.toThrow(/PROGRAMME_REQUIS/)
  })

  it('supprime les rattachements en cascade avec l’événement', async () => {
    const e = await creerEvenement({ ...evenementValide, programmeSlugs: ['yjc'] })
    await supprimerEvenement(e.id)
    const restants = await prisma.evenementProgramme.count({ where: { evenementId: e.id } })
    expect(restants).toBe(0)
  })
})
