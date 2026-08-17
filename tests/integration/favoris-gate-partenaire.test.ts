/**
 * @jest-environment node
 *
 * GUIC-706 (revue) — gate de visibilité jeune sur les FAVORIS : une offre favorite d'un
 * partenaire suspendu ne doit plus apparaître dans la liste (cohérent avec le détail qui
 * 404). Prisma RÉEL ; seuls session + rate-limit sont neutralisés. DB réelle.
 */
import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))

import { prisma } from '@/lib/prisma'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const listRoute = require('@/app/api/favoris/route')

jest.setTimeout(30000)

const PREFIX = 'test-favgate-706'
const jeune = `${PREFIX}-jeune`
const slug = `${PREFIX}-offre`
let orgId = ''
let oppId = ''

async function purge() {
  await prisma.opportuniteFavorite.deleteMany({ where: { cjsUid: jeune } })
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.utilisateur.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeAll(async () => {
  await purge()
  mockGetSession.mockResolvedValue({ cjsUid: jeune, nom: `${PREFIX}`, prenom: 'Awa' })
  await prisma.utilisateur.create({ data: { cjsUid: jeune, nom: `${PREFIX} Jeune`, prenom: 'Awa' } })
  const org = await prisma.organisation.create({ data: { nom: `${PREFIX} Org`, cjsUid: null, statut: 'active' }, select: { id: true } })
  orgId = org.id
  const opp = await prisma.opportunite.create({
    data: { slug, titre: `${PREFIX} Offre`, description: 'x', type: 'Emploi', domaine: 'Autre', organisation: `${PREFIX} Org`, organisationId: orgId, statut: 'publiee' },
    select: { id: true },
  })
  oppId = opp.id
  await prisma.opportuniteFavorite.create({ data: { cjsUid: jeune, opportuniteId: oppId } })
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

async function favorisIds(): Promise<string[]> {
  const res = await listRoute.GET(new NextRequest('http://localhost/api/favoris'))
  const json = await res.json()
  return (json.data ?? []).map((o: { id: string }) => o.id)
}

describe('GUIC-706 — gate favoris (partenaire suspendu)', () => {
  it('org active → l’offre favorite apparaît', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'active' } })
    expect(await favorisIds()).toContain(oppId)
  })

  it('org suspendue → l’offre favorite disparaît de la liste', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'suspendue' } })
    expect(await favorisIds()).not.toContain(oppId)
  })
})
