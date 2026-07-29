/**
 * @jest-environment node
 *
 * GUIC-684 — Rattachement aux programmes des ACTEURS : centres et organisations.
 *
 * Différence assumée avec les contenus (opportunités / ressources / événements) :
 * ici le rattachement est **facultatif**. Un centre est une infrastructure et une
 * organisation un partenaire — les deux existent indépendamment des programmes qui
 * s'y déploient. Rendre le lien obligatoire bloquerait la création d'un centre sans
 * apporter de sens métier.
 *
 * INTÉGRATION RÉELLE (prisma non mocké).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

import { creerCentre, modifierCentre, supprimerCentre } from '@/app/admin/centres/actions'
import { modifierPartenaire } from '@/app/admin/partenaires/actions'

const ADMIN = {
  cjsUid: 'test-admin-acteurs', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
  roles: ['admin'],
}

const PREFIX = 'GUIC684-acteur-'

const centreValide = {
  nom: `${PREFIX}Centre`,
  region: 'Dakar' as const,
  adresse: 'Rue 1',
  latitude: 14.7,
  longitude: -17.4,
  telephone: '+221771234567',
  responsable: 'Responsable test',
  estActif: true,
}

const centres: string[] = []
let organisationId: string | null = null

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(ADMIN)
})

beforeAll(async () => {
  const org = await prisma.organisation.create({
    data: { nom: `${PREFIX}Organisation`, cjsUid: 'test-recruteur-acteurs' },
    select: { id: true },
  })
  organisationId = org.id
})

afterEach(async () => {
  if (centres.length) {
    await prisma.centre.deleteMany({ where: { id: { in: centres } } })
    centres.length = 0
  }
})

afterAll(async () => {
  if (organisationId) await prisma.organisation.deleteMany({ where: { id: organisationId } })
  await prisma.$disconnect()
})

describe('GUIC-684 — rattachement des centres', () => {
  it('crée un centre SANS programme (rattachement facultatif)', async () => {
    const c = await creerCentre(centreValide)
    centres.push(c.id)

    const liens = await prisma.centreProgramme.count({ where: { centreId: c.id } })
    expect(liens).toBe(0)
  })

  it('rattache un centre aux programmes qui y sont déployés', async () => {
    const c = await creerCentre({ ...centreValide, programmeSlugs: ['yeah', 'edupop'] })
    centres.push(c.id)

    const liens = await prisma.centreProgramme.findMany({
      where: { centreId: c.id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(2)
    expect(liens.find((l) => l.programme.slug === 'yeah')?.principal).toBe(true)
  })

  it('remplace les rattachements à la modification, et sait tout retirer', async () => {
    const c = await creerCentre({ ...centreValide, programmeSlugs: ['yeah'] })
    centres.push(c.id)

    await modifierCentre(c.id, { ...centreValide, programmeSlugs: ['yjc'] })
    const apres = await prisma.centreProgramme.findMany({
      where: { centreId: c.id },
      include: { programme: true },
    })
    expect(apres).toHaveLength(1)
    expect(apres[0].programme.slug).toBe('yjc')

    // Facultatif → une liste vide doit pouvoir vider le rattachement.
    await modifierCentre(c.id, { ...centreValide, programmeSlugs: [] })
    expect(await prisma.centreProgramme.count({ where: { centreId: c.id } })).toBe(0)
  })

  it('supprime les rattachements en cascade avec le centre', async () => {
    const c = await creerCentre({ ...centreValide, programmeSlugs: ['yeah'] })
    await supprimerCentre(c.id)
    expect(await prisma.centreProgramme.count({ where: { centreId: c.id } })).toBe(0)
  })
})

describe('GUIC-684 — rattachement des organisations partenaires', () => {
  it('rattache un partenaire aux programmes dont il est partenaire', async () => {
    await modifierPartenaire(organisationId!, {
      nom: `${PREFIX}Organisation`,
      programmeSlugs: ['yaakaar'],
    })

    const liens = await prisma.organisationProgramme.findMany({
      where: { organisationId: organisationId! },
      include: { programme: true },
    })
    expect(liens).toHaveLength(1)
    expect(liens[0].programme.slug).toBe('yaakaar')
    expect(liens[0].principal).toBe(true)
  })

  it('laisse le partenaire sans programme si aucun n’est fourni', async () => {
    await modifierPartenaire(organisationId!, { nom: `${PREFIX}Organisation`, programmeSlugs: [] })
    expect(
      await prisma.organisationProgramme.count({ where: { organisationId: organisationId! } }),
    ).toBe(0)
  })
})
