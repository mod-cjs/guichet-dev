/**
 * @jest-environment node
 *
 * GUIC-474 — Présence événement (DB réelle). Prouve : création d'un événement
 * type `Cours` rattaché à un centre + marquage de présence (upsert `present`)
 * via l'action admin. Auth/cache mockés ; prisma réel (MariaDB 3307).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { creerEvenement, marquerPresenceEvenement } from '@/app/admin/evenements/actions'

const ADMIN = {
  cjsUid: 'test-admin-presence', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, roles: ['admin'], accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}

let centreId: string
let userCjsUid: string
let evId: string | null = null

beforeAll(async () => {
  const centre = await prisma.centre.findFirst({ select: { id: true } })
  const user = await prisma.utilisateur.findFirst({ select: { cjsUid: true } })
  if (!centre || !user) throw new Error('Fixture manquante (centre/utilisateur)')
  centreId = centre.id
  userCjsUid = user.cjsUid
})
afterEach(async () => {
  if (evId) {
    await prisma.inscriptionEvenement.deleteMany({ where: { evenementId: evId } }).catch(() => {})
    await prisma.evenement.delete({ where: { id: evId } }).catch(() => {})
    evId = null
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-474 — présence événement (DB réelle)', () => {
  it('crée un Cours au centre puis marque présent (walk-in upsert)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)

    const { id } = await creerEvenement({
      titre: 'Préparation examens (test)',
      description: 'Cours de préparation.',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: 'Cours' as any,
      dateDebut: new Date(),
      lieu: 'Salle test',
      centreId,
      estGratuit: true,
      // GUIC-684 — rattachement obligatoire à au moins un programme.
      programmeSlugs: ['yjc'],
    })
    evId = id

    const created = await prisma.evenement.findUnique({ where: { id }, select: { type: true, centreId: true } })
    expect(created?.type).toBe('Cours')
    expect(created?.centreId).toBe(centreId)

    // Walk-in : le jeune n'est pas pré-inscrit → upsert crée l'inscription en 'present'.
    await marquerPresenceEvenement(id, userCjsUid, true)
    const insc = await prisma.inscriptionEvenement.findUnique({
      where: { cjsUid_evenementId: { cjsUid: userCjsUid, evenementId: id } },
      select: { statut: true },
    })
    expect(insc?.statut).toBe('present')

    // Marquer absent → repasse 'inscrit'.
    await marquerPresenceEvenement(id, userCjsUid, false)
    const insc2 = await prisma.inscriptionEvenement.findUnique({
      where: { cjsUid_evenementId: { cjsUid: userCjsUid, evenementId: id } },
      select: { statut: true },
    })
    expect(insc2?.statut).toBe('inscrit')
  })
})
