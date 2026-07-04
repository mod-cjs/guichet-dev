import { buildSitemapEntries, STATIC_PATHS, type DynamicContent } from '@/lib/seo/sitemap'

const OLD_ENV = process.env.NEXT_PUBLIC_APP_URL
beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://guichetjeunesse.sn'
})
afterAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = OLD_ENV
})

const NOW = new Date('2026-07-04T00:00:00.000Z')

const emptyContent: DynamicContent = {
  opportunites: [],
  evenements: [],
  ressources: [],
  centres: [],
}

describe('buildSitemapEntries', () => {
  it('inclut toutes les pages statiques en URLs absolues', () => {
    const entries = buildSitemapEntries(emptyContent, NOW)
    expect(entries).toHaveLength(STATIC_PATHS.length)
    expect(entries.every((e) => e.url.startsWith('https://guichetjeunesse.sn'))).toBe(true)
    expect(entries.find((e) => e.url === 'https://guichetjeunesse.sn/')?.priority).toBe(1.0)
  })

  it('ajoute les entrées dynamiques avec le bon chemin et lastModified', () => {
    const content: DynamicContent = {
      opportunites: [{ slug: 'dev-web', updatedAt: new Date('2026-06-01T00:00:00.000Z') }],
      evenements: [{ id: 'evt-1', updatedAt: new Date('2026-06-02T00:00:00.000Z') }],
      ressources: [{ id: 'res-1', updatedAt: new Date('2026-06-03T00:00:00.000Z') }],
      centres: [{ slug: 'dakar', updatedAt: new Date('2026-06-04T00:00:00.000Z') }],
    }
    const entries = buildSitemapEntries(content, NOW)
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://guichetjeunesse.sn/opportunites/dev-web')
    expect(urls).toContain('https://guichetjeunesse.sn/agenda/evt-1')
    expect(urls).toContain('https://guichetjeunesse.sn/ressources/res-1')
    expect(urls).toContain('https://guichetjeunesse.sn/centres/dakar')

    const opp = entries.find((e) => e.url.endsWith('/opportunites/dev-web'))
    expect(opp?.lastModified).toEqual(new Date('2026-06-01T00:00:00.000Z'))
  })

  it("n'expose jamais d'espace privé (jeune/admin/api...)", () => {
    const content: DynamicContent = {
      ...emptyContent,
      opportunites: [{ slug: 'x', updatedAt: NOW }],
    }
    const entries = buildSitemapEntries(content, NOW)
    const priv = /\/(jeune|admin|conseiller|recruteur|centre-staff|api|auth|checkin)\b/
    expect(entries.some((e) => priv.test(e.url))).toBe(false)
  })
})
