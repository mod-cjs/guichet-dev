/**
 * @jest-environment node
 *
 * GUIC-597 — US-2 : orchestrateur du robot de découverte + route cron.
 * INTÉGRATION RÉELLE : prisma non mocké → MariaDB (guichet_mariadb:3307).
 * Le SEUL bord mocké est le transport HTTP (client injecté renvoyant des fixtures) :
 * on teste la vraie orchestration + persistance, pas le réseau.
 */
import { prisma } from '@/lib/prisma'
import { executerVeille } from '@/lib/curation/robot/run'
import type { ClientHttp } from '@/lib/curation/robot/http-client'

jest.setTimeout(30000)

const PREFIX = 'test-guic597'
const RUN = Date.now()

// Client HTTP factice : robots.txt permissif + un listing RSS de 2 items par source.
function clientFixture(liens: string[]): ClientHttp {
  return async (url: string) => {
    if (url.endsWith('/robots.txt')) {
      return { statut: 200, corps: 'User-agent: *\nDisallow:\n', contentType: 'text/plain' }
    }
    const items = liens.map((l) => `<item><link>${l}</link></item>`).join('')
    return {
      statut: 200,
      corps: `<rss><channel>${items}</channel></rss>`,
      contentType: 'application/rss+xml',
    }
  }
}

const noWait = async () => {}
// Les tests n'exercent pas le verrou Redis (couvert séparément) : sansVerrou.
const base = { attendre: noWait, sansVerrou: true as const }

async function creerSource(over: Record<string, unknown> = {}) {
  return prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/liste`,
      methode: 'rss',
      frequence: 'quotidienne',
      actif: true,
      prochaineVerifLe: new Date(Date.now() - 1000), // due
      ...over,
    },
  })
}

afterEach(async () => {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.executionVeille.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-597 — executerVeille (DB réelle, HTTP injecté)', () => {
  it('découvre les liens d’une source due, crée les items + le journal, met à jour les dates', async () => {
    const src = await creerSource()
    const liens = [`https://item-${RUN}.sn/1`, `https://item-${RUN}.sn/2`]

    const rapport = await executerVeille({ client: clientFixture(liens), ...base })

    expect(rapport.sourcesTraitees).toBeGreaterThanOrEqual(1)
    const items = await prisma.itemCuration.findMany({ where: { sourceId: src.id } })
    expect(items).toHaveLength(2)
    expect(items.every((i) => i.statut === 'decouvert')).toBe(true)
    expect(items.every((i) => i.empreinte.length === 64)).toBe(true)

    const exec = await prisma.executionVeille.findFirst({ where: { sourceId: src.id } })
    expect(exec?.nbNouveautes).toBe(2)
    expect(exec?.nbLiensDecouverts).toBe(2)
    expect(exec?.statut).toBe('ok')

    const apres = await prisma.sourceVeille.findUnique({ where: { id: src.id } })
    expect(apres?.derniereVerifLe).toBeInstanceOf(Date)
    expect(apres!.prochaineVerifLe!.getTime()).toBeGreaterThan(Date.now())
  })

  it('ne re-soumet pas une URL déjà vue (dédup par empreinte)', async () => {
    const src = await creerSource()
    const liens = [`https://item-${RUN}.sn/dup`]

    await executerVeille({ client: clientFixture(liens), ...base })
    // Rendre la source à nouveau due pour un second passage.
    await prisma.sourceVeille.update({
      where: { id: src.id },
      data: { prochaineVerifLe: new Date(Date.now() - 1000) },
    })
    await executerVeille({ client: clientFixture(liens), ...base })

    const items = await prisma.itemCuration.findMany({ where: { sourceId: src.id } })
    expect(items).toHaveLength(1) // pas de doublon au 2e run
    const execs = await prisma.executionVeille.findMany({ where: { sourceId: src.id } })
    expect(execs).toHaveLength(2)
    expect(execs.some((e) => e.nbNouveautes === 0)).toBe(true)
  })

  it('ignore les sources inactives et non dues', async () => {
    const inactive = await creerSource({ actif: false })
    const pasDue = await creerSource({ prochaineVerifLe: new Date(Date.now() + 3600_000) })

    await executerVeille({ client: clientFixture(['https://x.sn/1']), ...base })

    expect(await prisma.executionVeille.count({ where: { sourceId: inactive.id } })).toBe(0)
    expect(await prisma.executionVeille.count({ where: { sourceId: pasDue.id } })).toBe(0)
  })

  it('applique le délai de politesse INTRA-source (robots→listing, même hôte, honore Crawl-delay)', async () => {
    await creerSource() // UNE seule source → toute attente est forcément intra-source.
    const attentes: number[] = []
    const attendre = async (ms: number) => {
      attentes.push(ms)
    }
    const client: ClientHttp = async (url) => {
      if (url.endsWith('/robots.txt'))
        return { statut: 200, corps: 'User-agent: *\nCrawl-delay: 3\n', contentType: 'text/plain' }
      return { statut: 200, corps: '<rss><channel></channel></rss>', contentType: 'application/rss+xml' }
    }
    await executerVeille({ client, attendre, sansVerrou: true, delaiPolitesseParDefautMs: 2000 })
    // Une attente entre robots.txt et le listing du MÊME hôte, dimensionnée au Crawl-delay.
    expect(attentes).toContain(3000)
  })

  it('chute à zéro : listing interdit par robots → statut partiel, 0 lien, journalisé', async () => {
    const src = await creerSource()
    const clientBloque: ClientHttp = async (url) => {
      if (url.endsWith('/robots.txt'))
        return { statut: 200, corps: 'User-agent: *\nDisallow: /\n', contentType: 'text/plain' }
      return { statut: 200, corps: '<rss><channel></channel></rss>', contentType: 'application/rss+xml' }
    }
    await executerVeille({ client: clientBloque, ...base })

    expect(await prisma.itemCuration.count({ where: { sourceId: src.id } })).toBe(0)
    const exec = await prisma.executionVeille.findFirst({ where: { sourceId: src.id } })
    expect(exec?.statut).toBe('partiel') // signal exploité par le monitoring US-7
    expect(exec?.nbLiensDecouverts).toBe(0)
  })

  it('chute à zéro : listing vide (HTTP 200, 0 lien) → statut partiel', async () => {
    const src = await creerSource()
    const clientVide: ClientHttp = async (url) => {
      if (url.endsWith('/robots.txt'))
        return { statut: 200, corps: 'User-agent: *\nDisallow:\n', contentType: 'text/plain' }
      return { statut: 200, corps: '<rss><channel></channel></rss>', contentType: 'application/rss+xml' }
    }
    await executerVeille({ client: clientVide, ...base })
    const exec = await prisma.executionVeille.findFirst({ where: { sourceId: src.id } })
    expect(exec?.statut).toBe('partiel')
    expect(exec?.nbLiensDecouverts).toBe(0)
  })
})

describe('GUIC-597 — route cron /api/cron/veille-sources', () => {
  it('401 sans CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/veille-sources/route')
    const { NextRequest } = await import('next/server')
    const res = await GET(new NextRequest('http://localhost/api/cron/veille-sources'))
    expect(res.status).toBe(401)
  })
})
