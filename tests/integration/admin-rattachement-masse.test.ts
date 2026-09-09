/**
 * @jest-environment node
 *
 * GUIC-684 — Rattachement en masse des contenus restés sans programme.
 *
 * Sans cette action, l'obligation « au moins un programme » rend inéditable tout
 * contenu antérieur au ticket (4 340 opportunités sur la base de travail) : l'admin
 * devrait rouvrir chaque fiche. INTÉGRATION RÉELLE (prisma non mocké).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

import {
  compterContenusSansProgramme,
  rattacherContenusSansProgramme,
} from '@/app/admin/programmes/actions'

const ADMIN = {
  cjsUid: 'test-admin-masse', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
  roles: ['admin'],
}
const JEUNE = { ...ADMIN, roles: ['beneficiaire'] }

const PREFIX = 'GUIC684-masse-'
const ressources: string[] = []

/** Ressource créée SANS rattachement (état d'un contenu antérieur au ticket). */
async function ressourceOrpheline(suffixe: string): Promise<string> {
  const r = await prisma.ressource.create({
    data: {
      titre: `${PREFIX}${suffixe}`,
      description: 'Fixture rattachement en masse.',
      type: 'PDF',
      theme: 'Emploi',
      url: `https://example.org/${suffixe}.pdf`,
    },
    select: { id: true },
  })
  ressources.push(r.id)
  return r.id
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(ADMIN)
})

afterEach(async () => {
  if (ressources.length) {
    await prisma.ressource.deleteMany({ where: { id: { in: ressources } } })
    ressources.length = 0
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-684 — rattachement en masse', () => {
  it('compte les contenus sans aucun programme', async () => {
    const avant = await compterContenusSansProgramme('ressource')
    await ressourceOrpheline('compte-1')
    await ressourceOrpheline('compte-2')

    expect(await compterContenusSansProgramme('ressource')).toBe(avant + 2)
  })

  it('rattache tous les orphelins au programme choisi, en principal', async () => {
    const id = await ressourceOrpheline('rattache')

    const { count } = await rattacherContenusSansProgramme('ressource', 'yeah')
    expect(count).toBeGreaterThanOrEqual(1)

    const liens = await prisma.ressourceProgramme.findMany({
      where: { ressourceId: id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(1)
    expect(liens[0].programme.slug).toBe('yeah')
    expect(liens[0].principal).toBe(true)
  })

  it('ne touche PAS un contenu déjà rattaché (pas d’écrasement)', async () => {
    const id = await ressourceOrpheline('deja')
    const edupop = await prisma.programme.findUniqueOrThrow({ where: { slug: 'edupop' } })
    await prisma.ressourceProgramme.create({
      data: { ressourceId: id, programmeId: edupop.id, principal: true },
    })

    await rattacherContenusSansProgramme('ressource', 'yeah')

    const liens = await prisma.ressourceProgramme.findMany({
      where: { ressourceId: id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(1)
    expect(liens[0].programme.slug).toBe('edupop')
  })

  it('est idempotent : une seconde exécution ne crée rien', async () => {
    await ressourceOrpheline('idempotent')
    await rattacherContenusSansProgramme('ressource', 'yeah')

    const { count } = await rattacherContenusSansProgramme('ressource', 'yeah')
    expect(count).toBe(0)
  })

  it('refuse un non-admin', async () => {
    mockGetSession.mockResolvedValue(JEUNE)
    await expect(rattacherContenusSansProgramme('ressource', 'yeah')).rejects.toThrow(/FORBIDDEN/)
  })

  it('refuse un programme inconnu', async () => {
    await expect(
      rattacherContenusSansProgramme('ressource', 'programme-inexistant'),
    ).rejects.toThrow(/PROGRAMME_INCONNU/)
  })
})
