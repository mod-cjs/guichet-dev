/**
 * @jest-environment node
 *
 * GUIC-689 — Retrait de candidature à l'initiative du candidat.
 *
 * INTÉGRATION RÉELLE : prisma n'est pas mocké → vraie MariaDB. Seule la session
 * est simulée : c'est le bord d'authentification, pas le comportement testé.
 *
 * Pourquoi cette feature existe : l'écran de détail portait un bouton « Retirer
 * ma candidature » sans `onClick`, sans route et sans statut en base. Le bouton
 * a d'abord été retiré (il mentait), la fonctionnalité est construite ici.
 *
 * Les règles viennent de la maquette v5 (`candidatures-web.jsx:204,216`) :
 *  - le bouton n'apparaît PAS si la candidature est acceptée ou refusée ;
 *  - « sera définitivement retirée » → état terminal, pas de re-candidature ;
 *  - « le recruteur en sera informé » → notification, pas un simple changement
 *    de statut silencieux.
 */
import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
// Le rate-limit s'appuie sur Redis : hors sujet ici, et il rendrait la suite
// dépendante d'un service externe pour une règle qui n'est pas testée.
jest.mock('@/lib/rate-limit', () => ({ rateLimit: async () => null }))

import { POST } from '@/app/api/candidatures/[id]/retrait/route'

const CANDIDAT = 'fixture-retrait-candidat'
const AUTRE = 'fixture-retrait-intrus'
const RECRUTEUR = 'fixture-retrait-recruteur'
const PREFIX = 'Fixture retrait GUIC-689'

const session = (cjsUid: string) => ({
  cjsUid, nom: 'T', prenom: 'A', email: null, telephone: null, region: null,
  roles: ['beneficiaire'], accessToken: 'x', refreshToken: 'y', expiresAt: 0,
  onboardingComplete: true,
})

let opportuniteId: string

function req(): NextRequest {
  return new NextRequest('http://localhost/api/candidatures/x/retrait', { method: 'POST' })
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

/** Crée une candidature dans l'état voulu et rend son id. */
async function candidature(statut: 'En_attente' | 'Vue' | 'Retenue' | 'Refusee' | 'Retiree') {
  await prisma.candidature.deleteMany({ where: { cjsUid: CANDIDAT, opportuniteId } })
  const c = await prisma.candidature.create({
    data: { cjsUid: CANDIDAT, opportuniteId, statut },
    select: { id: true },
  })
  return c.id
}

beforeAll(async () => {
  for (const uid of [CANDIDAT, AUTRE, RECRUTEUR]) {
    await prisma.utilisateur.upsert({
      where: { cjsUid: uid },
      update: {},
      create: { cjsUid: uid, nom: 'Fixture', prenom: uid },
    })
  }
  const type = await prisma.opportuniteType.findFirstOrThrow({ select: { id: true } })
  const o = await prisma.opportunite.create({
    data: {
      titre: `${PREFIX} — offre`,
      slug: `fixture-retrait-guic689-${Date.now()}`,
      description: 'Fixture intégration.',
      typeId: type.id,
      type: 'Emploi',
      organisation: 'Fixture GUIC-689',
      domaine: 'Numerique',
      recruteurUid: RECRUTEUR,
    },
    select: { id: true },
  })
  opportuniteId = o.id
})

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { cjsUid: { in: [CANDIDAT, RECRUTEUR] } } })
  await prisma.notificationEnvoi.deleteMany({ where: { cjsUid: { in: [CANDIDAT, RECRUTEUR] } } })
  await prisma.candidature.deleteMany({ where: { opportuniteId } })
  await prisma.opportunite.delete({ where: { id: opportuniteId } }).catch(() => {})
  await prisma.utilisateur.deleteMany({ where: { cjsUid: { in: [CANDIDAT, AUTRE, RECRUTEUR] } } })
  await prisma.$disconnect()
})

beforeEach(() => jest.clearAllMocks())

describe('GUIC-689 — le candidat retire sa candidature', () => {
  it('En_attente → Retiree en base', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    const id = await candidature('En_attente')

    const res = await POST(req(), ctx(id))
    expect(res.status).toBe(200)

    const row = await prisma.candidature.findUnique({ where: { id }, select: { statut: true } })
    expect(row?.statut).toBe('Retiree')
  })

  it('Vue → Retiree : tant qu’aucune décision n’est prise, le retrait reste ouvert', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    const id = await candidature('Vue')

    expect((await POST(req(), ctx(id))).status).toBe(200)
    const row = await prisma.candidature.findUnique({ where: { id }, select: { statut: true } })
    expect(row?.statut).toBe('Retiree')
  })

  it('le RECRUTEUR est notifié — sinon il continue d’instruire un dossier abandonné', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    const id = await candidature('En_attente')
    await prisma.notification.deleteMany({ where: { cjsUid: RECRUTEUR } })

    await POST(req(), ctx(id))

    const notifs = await prisma.notification.findMany({
      where: { cjsUid: RECRUTEUR },
      select: { titre: true },
    })
    expect(notifs.length).toBeGreaterThan(0)
  })
})

describe('GUIC-689 — ce que le retrait REFUSE', () => {
  it('Retenue → 409, et le statut ne bouge pas', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    const id = await candidature('Retenue')

    expect((await POST(req(), ctx(id))).status).toBe(409)
    const row = await prisma.candidature.findUnique({ where: { id }, select: { statut: true } })
    expect(row?.statut).toBe('Retenue')
  })

  it('Refusee → 409 : la décision du recruteur reste lisible', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    const id = await candidature('Refusee')

    expect((await POST(req(), ctx(id))).status).toBe(409)
    const row = await prisma.candidature.findUnique({ where: { id }, select: { statut: true } })
    expect(row?.statut).toBe('Refusee')
  })

  it('deux retraits d’affilée : le second est refusé, sans seconde notification', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    const id = await candidature('En_attente')
    await prisma.notification.deleteMany({ where: { cjsUid: RECRUTEUR } })

    expect((await POST(req(), ctx(id))).status).toBe(200)
    const apresPremier = await prisma.notification.count({ where: { cjsUid: RECRUTEUR } })

    expect((await POST(req(), ctx(id))).status).toBe(409)
    expect(await prisma.notification.count({ where: { cjsUid: RECRUTEUR } })).toBe(apresPremier)
  })

  it('un AUTRE utilisateur reçoit 404 — l’existence de la candidature ne fuite pas', async () => {
    const id = await candidature('En_attente')
    mockGetSession.mockResolvedValue(session(AUTRE))

    expect((await POST(req(), ctx(id))).status).toBe(404)
    const row = await prisma.candidature.findUnique({ where: { id }, select: { statut: true } })
    expect(row?.statut).toBe('En_attente')
  })

  it('sans session → 401', async () => {
    mockGetSession.mockResolvedValue(null)
    const id = await candidature('En_attente')

    expect((await POST(req(), ctx(id))).status).toBe(401)
    const row = await prisma.candidature.findUnique({ where: { id }, select: { statut: true } })
    expect(row?.statut).toBe('En_attente')
  })

  it('id inconnu → 404', async () => {
    mockGetSession.mockResolvedValue(session(CANDIDAT))
    expect((await POST(req(), ctx('11111111-2222-3333-4444-555555555555'))).status).toBe(404)
  })
})
