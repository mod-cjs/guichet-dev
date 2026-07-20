/**
 * @jest-environment node
 *
 * GUIC-598 — US-3 : orchestrateur d'extraction (phase 2). INTÉGRATION RÉELLE MariaDB
 * (guichet_mariadb:3307), transport HTTP injecté (fixtures) → vraie extraction + persistance.
 */
import { prisma } from '@/lib/prisma'
import { executerExtraction } from '@/lib/curation/extraction/run'
import type { ClientHttp } from '@/lib/curation/robot/http-client'

jest.setTimeout(30000)

const PREFIX = 'test-guic598'
const RUN = Date.now()

const PAGE_OFFRE = `<html><head>
  <script type="application/ld+json">
  {"@type":"JobPosting","title":"Chargé de projet","description":"Poste à Thiès.",
   "hiringOrganization":{"name":"ONG Teranga"},"validThrough":"2026-10-15",
   "jobLocation":{"address":{"addressRegion":"Thiès"}}}
  </script></head><body>...</body></html>`

const clientOffre: ClientHttp = async () => ({
  statut: 200,
  corps: PAGE_OFFRE,
  contentType: 'text/html',
})

async function creerSourceEtItem(statut: 'decouvert' | 'a_valider' = 'decouvert') {
  const source = await prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/liste`,
      methode: 'rss',
      frequence: 'quotidienne',
    },
  })
  const url = `https://veille-${RUN}.sn/offre/${Math.random().toString(36).slice(2, 8)}`
  const item = await prisma.itemCuration.create({
    data: {
      sourceId: source.id,
      urlCanonique: url,
      empreinte: require('node:crypto').createHash('sha256').update(url).digest('hex'),
      statut,
    },
  })
  return { source, item }
}

afterEach(async () => {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-598 — executerExtraction (DB réelle, HTTP injecté)', () => {
  it('extrait un item decouvert → payloadExtrait + score + statut a_valider', async () => {
    const { item } = await creerSourceEtItem('decouvert')

    const rapport = await executerExtraction({ client: clientOffre, attendre: async () => {} })
    expect(rapport.itemsTraites).toBeGreaterThanOrEqual(1)

    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    expect(apres?.statut).toBe('a_valider')
    expect(apres?.titre).toBe('Chargé de projet')
    expect(apres?.scoreCompletude).toBeGreaterThan(0)
    const payload = apres?.payloadExtrait as Record<string, unknown> | null
    expect(payload?.organisation).toBe('ONG Teranga')
    expect(payload?.region).toBe('Thiès')
  })

  it('ne ré-extrait pas un item déjà a_valider', async () => {
    const { item } = await creerSourceEtItem('a_valider')
    await executerExtraction({ client: clientOffre, attendre: async () => {} })
    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    // Statut inchangé, pas d'écrasement (titre resté null).
    expect(apres?.statut).toBe('a_valider')
    expect(apres?.titre).toBeNull()
  })
})
