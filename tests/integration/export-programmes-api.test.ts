/**
 * @jest-environment node
 *
 * GUIC-684 — Export Data Hub des programmes sectoriels.
 *
 * La route existait en stub (`data: []`) « à implémenter une fois le modèle de
 * données confirmé » : le modèle l'est désormais, et les rattachements aussi.
 *
 * Couvre aussi la garde d'authentification DURCIE (cf. GUIC-631) : la version
 * faible (`apiKey !== process.env.DATAHUB_API_KEY`) accorde l'accès quand la
 * variable est absente ET qu'aucun en-tête n'est envoyé — `undefined !== undefined`
 * est faux. Sur une route qui sert des données, c'est une porte ouverte.
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/export/programmes/route'

const CLE = 'cle-datahub-test-684'

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/v1/export/programmes', { headers })
}

const ENV = process.env.DATAHUB_API_KEY

afterAll(() => {
  process.env.DATAHUB_API_KEY = ENV
})

describe('GUIC-684 — GET /api/v1/export/programmes', () => {
  it('refuse sans clé', async () => {
    process.env.DATAHUB_API_KEY = CLE
    expect((await GET(req())).status).toBe(401)
  })

  it('refuse une clé erronée', async () => {
    process.env.DATAHUB_API_KEY = CLE
    expect((await GET(req({ authorization: 'Bearer mauvaise' }))).status).toBe(401)
  })

  it('refuse si DATAHUB_API_KEY n’est pas configurée côté serveur', async () => {
    delete process.env.DATAHUB_API_KEY
    expect((await GET(req())).status).toBe(401)
  })

  it('sert les programmes actifs avec leurs compteurs de rattachement', async () => {
    process.env.DATAHUB_API_KEY = CLE
    const res = await GET(req({ authorization: `Bearer ${CLE}` }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.meta.total).toBeGreaterThanOrEqual(4)

    const yeah = body.data.find((p: { slug: string }) => p.slug === 'yeah')
    expect(yeah).toMatchObject({
      slug: 'yeah',
      nom: expect.any(String),
      actif: true,
    })
    // Le rattachement est la valeur ajoutée de cet export : sans les compteurs,
    // le Data Hub ne saurait pas ce que pèse chaque programme.
    expect(typeof yeah.opportunites_count).toBe('number')
    expect(typeof yeah.ressources_count).toBe('number')
    expect(typeof yeah.evenements_count).toBe('number')
  })
})
