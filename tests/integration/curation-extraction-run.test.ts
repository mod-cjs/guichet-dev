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

// Scope d'isolation : on ne traite QUE les sources de ce test (runs parallèles).
let sourceIds: string[] = []
const extraire = (client: ClientHttp) =>
  executerExtraction({ client, attendre: async () => {}, sourceIds })

async function creerSourceEtItem(statut: 'decouvert' | 'a_valider' = 'decouvert') {
  const source = await prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/liste`,
      methode: 'rss',
      frequence: 'quotidienne',
    },
  })
  sourceIds.push(source.id)
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

// Nettoyage AVANT la 1re exécution aussi : un run précédent tué (SIGKILL) laisse des
// lignes `test-guic598…` qui pollueraient l'extraction (elle scanne tous les `decouvert`).
beforeAll(async () => {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
})
afterEach(async () => {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  sourceIds = []
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-598 — executerExtraction (DB réelle, HTTP injecté)', () => {
  it('extrait un item decouvert → payloadExtrait + score + statut a_valider', async () => {
    const { item } = await creerSourceEtItem('decouvert')

    const rapport = await extraire(clientOffre)
    expect(rapport.itemsTraites).toBeGreaterThanOrEqual(1)

    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    expect(apres?.statut).toBe('a_valider')
    expect(apres?.titre).toBe('Chargé de projet')
    expect(apres?.scoreCompletude).toBeGreaterThan(0)
    const payload = apres?.payloadExtrait as Record<string, unknown> | null
    expect(payload?.organisation).toBe('ONG Teranga')
    // Région mappée sur l'enum Guichet (Thiès → Thies), texte brut conservé.
    expect(payload?.region).toBe('Thies')
    expect(payload?.regionTexte).toBe('Thiès')
  })

  it('ne ré-extrait pas un item déjà a_valider', async () => {
    const { item } = await creerSourceEtItem('a_valider')
    await extraire(clientOffre)
    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    // Statut inchangé, pas d'écrasement (titre resté null).
    expect(apres?.statut).toBe('a_valider')
    expect(apres?.titre).toBeNull()
  })

  it('anti-famine : un item en échec incrémente nbTentatives puis escalade en_attente', async () => {
    const { item } = await creerSourceEtItem('decouvert')
    const client404: ClientHttp = async (url) =>
      url.endsWith('/robots.txt')
        ? { statut: 200, corps: 'User-agent: *\nDisallow:\n', contentType: 'text/plain' }
        : { statut: 404, corps: '', contentType: null }

    // 3 passages : tentatives 1, 2, 3 → escalade au 3e.
    for (let i = 0; i < 3; i++) {
      await extraire(client404)
    }
    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    expect(apres?.nbTentatives).toBe(3)
    expect(apres?.statut).toBe('en_attente') // sorti de la file decouvert (anti-famine)

    // Un 4e passage ne le re-sélectionne PLUS : preuve = l'état n'a pas bougé (nbTentatives
    // resterait à 3, pas 4). `itemsTraites` seul serait tautologique sous client 404.
    await extraire(client404)
    const apres4 = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    expect(apres4?.nbTentatives).toBe(3) // inchangé → l'item n'a pas été re-traité
    expect(apres4?.statut).toBe('en_attente')
  })

  it('respecte robots.txt par item (chemin Disallow → échec, pas d’extraction)', async () => {
    const { item } = await creerSourceEtItem('decouvert')
    const clientBloque: ClientHttp = async (url) =>
      url.endsWith('/robots.txt')
        ? { statut: 200, corps: 'User-agent: *\nDisallow: /\n', contentType: 'text/plain' }
        : { statut: 200, corps: PAGE_OFFRE, contentType: 'text/html' }
    await extraire(clientBloque)
    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    expect(apres?.statut).toBe('decouvert') // pas extrait
    expect(apres?.nbTentatives).toBe(1)
  })
})

// GUIC-704 · slice 3 — câblage de l'enrichissement IA dans executerExtraction.
describe('GUIC-704 — enrichissement IA (câblage, seam injecté)', () => {
  // Page og-only SANS json-ld → déterministe faible (pas de type/région/deadline) → enrichit.
  const PAGE_OG = `<html><head>
    <title>Bourse master 2026</title>
    <meta property="og:title" content="Bourse master 2026">
    <meta property="og:description" content="Financement pour un master.">
    </head><body>Détails.</body></html>`
  const clientOg: ClientHttp = async () => ({ statut: 200, corps: PAGE_OG, contentType: 'text/html' })

  async function sourceAvecDefaut(slugDefaut: string) {
    const t = await prisma.opportuniteType.findFirstOrThrow({ where: { slug: slugDefaut }, select: { id: true } })
    const source = await prisma.sourceVeille.create({
      data: {
        nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
        url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/liste`,
        methode: 'auto',
        frequence: 'quotidienne',
        typeDefautId: t.id,
      },
    })
    sourceIds.push(source.id)
    const url = `https://veille-${RUN}.sn/offre/${Math.random().toString(36).slice(2, 8)}`
    const item = await prisma.itemCuration.create({
      data: { sourceId: source.id, urlCanonique: url, empreinte: require('node:crypto').createHash('sha256').update(url).digest('hex'), statut: 'decouvert' },
    })
    return { source, item }
  }

  it('comble les trous, pose enrichiParIa, et le TYPE du contenu prime sur typeDefaut (D3)', async () => {
    const bourse = await prisma.opportuniteType.findFirstOrThrow({ where: { slug: 'bourse' }, select: { id: true } })
    const { item } = await sourceAvecDefaut('emploi') // défaut = emploi, mais le contenu est une bourse

    const enrichir = jest.fn(async () => ({
      typeSlugSchemaOrg: 'bourse',
      region: 'Dakar',
      regionTexte: 'Dakar',
      deadline: '2026-11-30',
      organisation: 'Campus France',
    }))

    await executerExtraction({ client: clientOg, attendre: async () => {}, sourceIds, enrichir })

    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    const p = apres?.payloadExtrait as Record<string, unknown>
    expect(apres?.statut).toBe('a_valider')
    expect(p.typeId).toBe(bourse.id) // le type LLM gagne sur le typeDefaut emploi
    expect(p.region).toBe('Dakar')
    expect(p.deadline).toBe('2026-11-30')
    expect(p.organisation).toBe('Campus France')
    expect(p.enrichiParIa).toBe(true)
    expect(enrichir).toHaveBeenCalledTimes(1)
    // Le seam reçoit ce que le déterministe a déjà trouvé (pour cibler les trous).
    expect((enrichir.mock.calls[0][0] as { dejaConnu: Record<string, unknown> }).dejaConnu.titre).toBe('Bourse master 2026')
  })

  it('gate OFF par défaut : sans seam ni env → pas d’enrichissement, typeDefaut en filet', async () => {
    const emploi = await prisma.opportuniteType.findFirstOrThrow({ where: { slug: 'emploi' }, select: { id: true } })
    const { item } = await sourceAvecDefaut('emploi')

    await executerExtraction({ client: clientOg, attendre: async () => {}, sourceIds }) // aucun deps.enrichir

    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    const p = apres?.payloadExtrait as Record<string, unknown>
    expect(p.typeId).toBe(emploi.id) // filet final = typeDefaut
    expect(p.enrichiParIa).toBeFalsy()
  })

  it('item déjà complet (json-ld riche) → enrichissement NON appelé (économie)', async () => {
    const { item } = await sourceAvecDefaut('emploi')
    const enrichir = jest.fn(async () => ({}))
    // PAGE_OFFRE (JobPosting complet : titre/desc/org/région/deadline) → score haut → pas de trou.
    await executerExtraction({ client: clientOffre, attendre: async () => {}, sourceIds, enrichir })
    const apres = await prisma.itemCuration.findUnique({ where: { id: item.id } })
    expect(apres?.statut).toBe('a_valider')
    expect(enrichir).not.toHaveBeenCalled()
  })
})
