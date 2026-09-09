/**
 * @jest-environment node
 *
 * GUIC-684 — Les créations de contenu HORS admin doivent elles aussi porter un
 * rattachement : le recruteur qui publie une offre, le conseiller qui propose un
 * événement. INTÉGRATION RÉELLE (prisma non mocké).
 *
 * Sans ces chemins, l'invariant est contournable : un recruteur créerait une offre
 * sans programme (échec dur côté service), et un conseiller un événement orphelin
 * qu'aucun admin ne pourrait plus éditer.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

import { creerOffreRecruteur } from '@/app/recruteur/mes-offres/actions'
import { creerPublication } from '@/app/conseiller/publications/actions'

const PREFIX = 'GUIC684-noadmin-'
const RECRUTEUR_UID = 'test-recruteur-684'
const CONSEILLER_UID = 'test-conseiller-684'

const opportunites: string[] = []
const evenements: string[] = []
let centreId: string | null = null
let organisationId: string | null = null

const session = (uid: string, role: string) => ({
  cjsUid: uid, nom: 'T', prenom: 'A', email: null, telephone: null, region: null,
  accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true, roles: [role],
})

beforeAll(async () => {
  // GUIC-706 — le gate de publication exige que la PERSONNE existe et soit active.
  await prisma.utilisateur.upsert({
    where: { cjsUid: RECRUTEUR_UID },
    create: { cjsUid: RECRUTEUR_UID, nom: 'T', prenom: 'A', statut: 'actif' },
    update: { statut: 'actif' },
  })
  // Un recruteur sans organisation ne peut pas publier (NO_ORGANISATION) : on en pose une.
  const org = await prisma.organisation.create({
    data: { nom: `${PREFIX}Organisation`, cjsUid: RECRUTEUR_UID },
    select: { id: true },
  })
  organisationId = org.id

  const centre = await prisma.centre.findFirst({ where: { estActif: true }, select: { id: true } })
  centreId = centre?.id ?? null
  if (centreId) {
    await prisma.agentCentre.upsert({
      where: { cjsUid_centreId: { cjsUid: CONSEILLER_UID, centreId } },
      create: { cjsUid: CONSEILLER_UID, centreId, role: 'conseiller' },
      update: {},
    })
  }
})

afterEach(async () => {
  if (opportunites.length) {
    await prisma.opportunite.deleteMany({ where: { id: { in: opportunites } } })
    opportunites.length = 0
  }
  if (evenements.length) {
    await prisma.evenement.deleteMany({ where: { id: { in: evenements } } })
    evenements.length = 0
  }
})

afterAll(async () => {
  await prisma.agentCentre.deleteMany({ where: { cjsUid: CONSEILLER_UID } })
  if (organisationId) await prisma.organisation.deleteMany({ where: { id: organisationId } })
  await prisma.utilisateur.deleteMany({ where: { cjsUid: RECRUTEUR_UID } })
  await prisma.$disconnect()
})

describe('GUIC-684 — offre créée par un recruteur', () => {
  const offre = {
    type: 'stage' as const,
    titre: `${PREFIX}Stage recruteur`,
    description: 'Fixture intégration.',
    domaine: 'Economie' as const,
    region: 'Dakar' as const,
    dureeMois: 6,
  }

  it('rattache l’offre au programme choisi', async () => {
    mockGetSession.mockResolvedValue(session(RECRUTEUR_UID, 'recruteur'))
    const _res = await creerOffreRecruteur({ ...offre, programmeSlugs: ['yjc'] })
    if (!_res.ok) throw new Error(_res.code)
    const { id } = _res
    opportunites.push(id)

    const liens = await prisma.opportuniteProgramme.findMany({
      where: { opportuniteId: id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(1)
    expect(liens[0].programme.slug).toBe('yjc')
    expect(liens[0].principal).toBe(true)
  })

  it('refuse une offre sans programme', async () => {
    mockGetSession.mockResolvedValue(session(RECRUTEUR_UID, 'recruteur'))
    await expect(
      creerOffreRecruteur({ ...offre, programmeSlugs: [] }),
    ).rejects.toThrow(/PROGRAMME_REQUIS/)
  })
})

describe('GUIC-684 — événement proposé par un conseiller', () => {
  it('rattache l’événement au programme choisi', async () => {
    if (!centreId) return // pas de centre en base → scénario non jouable
    mockGetSession.mockResolvedValue(session(CONSEILLER_UID, 'conseiller'))

    const res = await creerPublication({
      titre: `${PREFIX}Atelier conseiller`,
      description: 'Fixture intégration.',
      type: 'Atelier',
      dateDebut: '2026-10-01T09:00:00Z',
      lieu: 'Salle 1',
      estGratuit: true,
      programmeSlugs: ['edupop'],
    })
    expect(res.data).toBeDefined()
    evenements.push(res.data!.id)

    const liens = await prisma.evenementProgramme.findMany({
      where: { evenementId: res.data!.id },
      include: { programme: true },
    })
    expect(liens).toHaveLength(1)
    expect(liens[0].programme.slug).toBe('edupop')
  })

  it('refuse une publication sans programme, sans créer d’événement orphelin', async () => {
    if (!centreId) return
    mockGetSession.mockResolvedValue(session(CONSEILLER_UID, 'conseiller'))

    const res = await creerPublication({
      titre: `${PREFIX}Sans programme`,
      description: 'Fixture intégration.',
      type: 'Atelier',
      dateDebut: '2026-10-02T09:00:00Z',
      lieu: 'Salle 1',
      estGratuit: true,
      programmeSlugs: [],
    })
    expect(res.error?.code).toBe('VALIDATION_ERROR')

    const orphelin = await prisma.evenement.findFirst({ where: { titre: `${PREFIX}Sans programme` } })
    expect(orphelin).toBeNull()
  })
})
