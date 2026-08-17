/**
 * @jest-environment node
 *
 * GUIC-706 (revue) — gate de visibilité jeune sur le DASHBOARD : les recommandations
 * (`recoOpps`) ne doivent pas contenir les offres d'un partenaire suspendu. DB réelle.
 */
import { prisma } from '@/lib/prisma'
import { loadDashboardData } from '@/lib/loaders/dashboard'

jest.setTimeout(30000)

const PREFIX = 'test-dashgate-706'
const jeune = `${PREFIX}-jeune`
const slug = `${PREFIX}-offre`
let orgId = ''

async function purge() {
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.utilisateur.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeAll(async () => {
  await purge()
  await prisma.utilisateur.create({ data: { cjsUid: jeune, nom: `${PREFIX} Jeune`, prenom: 'Awa' } })
  const org = await prisma.organisation.create({ data: { nom: `${PREFIX} Org`, cjsUid: null, statut: 'active' }, select: { id: true } })
  orgId = org.id
  await prisma.opportunite.create({
    data: { slug, titre: `${PREFIX} Offre reco`, description: 'x', type: 'Emploi', domaine: 'Autre', organisation: `${PREFIX} Org`, organisationId: orgId, statut: 'publiee' },
  })
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

const contient = (data: { recoOpps: { href: string }[] }) => data.recoOpps.some((r) => r.href.includes(slug))

describe('GUIC-706 — gate dashboard jeune (partenaire suspendu)', () => {
  it('org active → l’offre peut être recommandée', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'active' } })
    expect(contient(await loadDashboardData(jeune))).toBe(true)
  })

  it('org suspendue → l’offre disparaît des recommandations', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'suspendue' } })
    expect(contient(await loadDashboardData(jeune))).toBe(false)
  })
})
