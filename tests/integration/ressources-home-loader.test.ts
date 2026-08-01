/**
 * @jest-environment node
 *
 * GUIC-689 (Lot F2) — écran d'accueil médiathèque. INTÉGRATION RÉELLE :
 * prisma N'EST PAS mocké → vraie MariaDB (quality-charter §3). Pré-requis :
 * DATABASE_URL vers la base de test locale (docker gj-maria 3307).
 *
 * Couvre :
 *  1. `listRessources({ theme })` — filtre exact par thème.
 *  2. `getRessourcesHome()` — catégories (`theme` groupé + compté), étagère
 *     « Ajoutées récemment » (createdAt desc) et « Les plus consultées »
 *     (vues desc, createdAt desc en tie-break).
 *
 * Les fixtures utilisent des thèmes/valeurs extrêmes et hautement uniques
 * (préfixe `GUIC689-`) pour rester robustes à la pollution de la base de
 * test partagée par des runs parallèles (cf. CJS_AGENT_RULES §"Vert ≠ prouvé").
 */
import { prisma } from '@/lib/prisma'
import * as ressourcesLoader from '@/lib/loaders/ressources'

/**
 * GUIC-689 — commit RED : `getRessourcesHome` et le filtre `theme` de
 * `listRessources` n'existent pas encore (implémentation à suivre dans le
 * commit GREEN). Accès non typé assumé le temps de ce commit — le module
 * expose déjà `listRessources`, seuls le nouveau champ `theme` et le nouvel
 * export `getRessourcesHome` sont absents.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loader = ressourcesLoader as any
const { listRessources, getRessourcesHome } = loader as {
  listRessources: (f: Record<string, unknown>) => Promise<{
    items: Array<{ id: string; titre: string; theme: string; vues: number }>
    total: number
  }>
  getRessourcesHome: (o?: { limit?: number; categoriesLimit?: number }) => Promise<{
    categories: Array<{ theme: string; count: number }>
    recentes: Array<{ id: string }>
    populaires: Array<{ id: string; vues: number }>
  }>
}

jest.setTimeout(30000)

const THEME_FILTER = 'GUIC689-ThemeFilter-Test'
const THEME_CATEGORY = 'GUIC689-Category-Test'

const created: string[] = []

interface RessourceFixtureInput {
  titre?: string
  description?: string
  type?: 'PDF' | 'Video' | 'Lien' | 'Guide' | 'Outil'
  theme?: string
  url?: string
  estPublic?: boolean
  vues?: number
  createdAt?: Date
}

function fixture(overrides: RessourceFixtureInput = {}) {
  return {
    titre: 'GUIC689 — fixture ressource',
    description: 'Fixture intégration GUIC-689 Lot F2.',
    type: 'PDF' as const,
    theme: 'GUIC689-Default-Test',
    url: 'https://example.org/guic689-fixture.pdf',
    estPublic: true,
    ...overrides,
  }
}

async function createRessource(overrides: RessourceFixtureInput = {}) {
  const r = await prisma.ressource.create({ data: fixture(overrides) })
  created.push(r.id)
  return r
}

afterEach(async () => {
  if (created.length) {
    await prisma.ressource.deleteMany({ where: { id: { in: created } } })
    created.length = 0
  }
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-689 — loader accueil médiathèque (DB réelle)', () => {
  it('given deux ressources publiques du même thème, when listRessources({ theme }), then seules elles remontent', async () => {
    await createRessource({ titre: 'A', theme: THEME_FILTER })
    await createRessource({ titre: 'B', theme: THEME_FILTER })

    const { items, total } = await listRessources({ theme: THEME_FILTER })

    expect(total).toBe(2)
    expect(items).toHaveLength(2)
    expect(items.every((i) => i.theme === THEME_FILTER)).toBe(true)
  })

  it('given une ressource non publique du même thème, when listRessources({ theme }), then elle est exclue', async () => {
    await createRessource({ titre: 'Publique', theme: THEME_FILTER, estPublic: true })
    await createRessource({ titre: 'Privée', theme: THEME_FILTER, estPublic: false })

    const { items, total } = await listRessources({ theme: THEME_FILTER })

    expect(total).toBe(1)
    expect(items[0]?.titre).toBe('Publique')
  })

  it('given un thème avec un nombre de ressources nettement supérieur aux autres, when getRessourcesHome, then il apparaît dans les catégories avec le bon compte', async () => {
    for (let i = 0; i < 9; i += 1) {
      await createRessource({ titre: `Cat ${i}`, theme: THEME_CATEGORY })
    }

    const { categories } = await getRessourcesHome({ categoriesLimit: 5 })

    const found = categories.find((c) => c.theme === THEME_CATEGORY)
    expect(found).toBeDefined()
    expect(found?.count).toBe(9)
  })

  it('given une ressource créée avec une date future extrême, when getRessourcesHome, then elle est en tête des « Ajoutées récemment »', async () => {
    const farFuture = new Date('2099-01-01T00:00:00.000Z')
    const r = await createRessource({
      titre: 'GUIC689 — la plus récente',
      theme: 'GUIC689-Recentes-Test',
      createdAt: farFuture,
    })

    const { recentes } = await getRessourcesHome({ limit: 10 })

    expect(recentes[0]?.id).toBe(r.id)
  })

  it('given une ressource avec un compteur de vues extrême, when getRessourcesHome, then elle est en tête des « plus consultées »', async () => {
    const r = await createRessource({
      titre: 'GUIC689 — la plus consultée',
      theme: 'GUIC689-Populaires-Test',
      vues: 424242,
    })

    const { populaires } = await getRessourcesHome({ limit: 10 })

    expect(populaires[0]?.id).toBe(r.id)
    expect(populaires[0]?.vues).toBe(424242)
  })

  it('given une ressource non publique, when getRessourcesHome, then elle n\'apparaît dans aucune étagère', async () => {
    const r = await createRessource({
      titre: 'GUIC689 — privée exclue',
      theme: 'GUIC689-Privee-Test',
      estPublic: false,
      vues: 999999,
      createdAt: new Date('2099-06-01T00:00:00.000Z'),
    })

    const { recentes, populaires, categories } = await getRessourcesHome({ limit: 50, categoriesLimit: 50 })

    expect(recentes.some((i) => i.id === r.id)).toBe(false)
    expect(populaires.some((i) => i.id === r.id)).toBe(false)
    expect(categories.some((c) => c.theme === 'GUIC689-Privee-Test')).toBe(false)
  })
})
