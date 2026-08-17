/**
 * @jest-environment node
 *
 * GUIC-705 — gate de visibilité : un partenaire SUSPENDU masque ses offres côté jeune
 * (catalogue + détail). Intégration réelle MariaDB (prisma non mocké).
 */
import { prisma } from '@/lib/prisma'
import { getOpportuniteDetail } from '@/lib/opportunites-loader'

jest.setTimeout(30000)

const PREFIX = 'test-gate-705'
const RUN = Date.now()
let orgId = ''
let slug = ''

async function purge() {
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeAll(async () => {
  await purge()
  const org = await prisma.organisation.create({ data: { nom: `${PREFIX} Employeur`, cjsUid: null, statut: 'active' }, select: { id: true } })
  orgId = org.id
  slug = `${PREFIX}-offre-${RUN}`
  await prisma.opportunite.create({
    data: {
      slug, titre: `${PREFIX} Développeur`, description: 'Poste de test à Dakar.',
      // 'Autre' : valeur présente dans TOUTES les versions de l'enum Domaine (la
      // taxonomie a bougé GUIC-689 sur dev) → test stable, il porte sur org.statut.
      type: 'Emploi', domaine: 'Autre', organisation: `${PREFIX} Employeur`,
      statut: 'publiee', organisationId: orgId,
    },
  })
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-705 — gate partenaire suspendu', () => {
  it('org ACTIVE : le détail de l’offre est visible', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'active' } })
    expect(await getOpportuniteDetail(slug)).not.toBeNull()
  })

  it('org SUSPENDUE : le détail disparaît (404 côté jeune)', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'suspendue' } })
    expect(await getOpportuniteDetail(slug)).toBeNull()
  })

  it('réactivation : le détail redevient visible', async () => {
    await prisma.organisation.update({ where: { id: orgId }, data: { statut: 'active' } })
    expect(await getOpportuniteDetail(slug)).not.toBeNull()
  })
})
