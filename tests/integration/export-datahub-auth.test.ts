/**
 * @jest-environment node
 *
 * M13 / GUIC-631 — Garde d'authentification des routes d'export Data Hub.
 *
 * La forme faible `apiKey !== process.env.DATAHUB_API_KEY` accorde l'accès quand la
 * variable n'est PAS configurée côté serveur et que l'appelant n'envoie aucun en-tête :
 * `undefined !== undefined` est faux. Cas déjà vécu sur un environnement où la variable
 * n'avait pas été propagée.
 *
 * Ce test verrouille l'invariant sur les routes historiques restantes, pour qu'aucune ne
 * puisse régresser isolément — c'est exactement ce qui s'était produit : la garde avait été
 * durcie sur `opportunites` sans être propagée aux trois soeurs.
 *
 * Les stubs `utilisateurs` et `formations` ont été retirés au lot 5 : le premier est servi
 * par la route dynamique pilotée par le contrat, le second n'a jamais existé comme flux —
 * une formation est une opportunité dont le type vaut Formation.
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    programme: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const ROUTES: ReadonlyArray<{ stream: string; mod: { GET: (r: NextRequest) => Promise<Response> } }> = [
  { stream: 'opportunites', mod: require('@/app/api/v1/export/opportunites/route') },
  { stream: 'programmes', mod: require('@/app/api/v1/export/programmes/route') },
]
/* eslint-enable @typescript-eslint/no-require-imports */

function req(stream: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/v1/export/${stream}`, { headers })
}

beforeEach(() => {
  process.env.DATAHUB_API_KEY = 'test-key'
})

describe.each(ROUTES)('GET /api/v1/export/$stream — garde Data Hub', ({ stream, mod }) => {
  it('refuse sans clé API', async () => {
    const res = await mod.GET(req(stream))
    expect(res.status).toBe(401)
  })

  it('refuse une clé API invalide', async () => {
    const res = await mod.GET(req(stream, { authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it("refuse quand DATAHUB_API_KEY n'est pas configurée côté serveur, même sans en-tête", async () => {
    delete process.env.DATAHUB_API_KEY
    const res = await mod.GET(req(stream))
    expect(res.status).toBe(401)
  })

  // Variable présente mais vide + en-tête `authorization` vide : les deux valent la chaîne
  // vide, donc la comparaison faible les juge égales et accorde l'accès. Un en-tête
  // `Bearer ` ne reproduit PAS le cas — la spec HTTP le trime en `Bearer`.
  it('refuse quand DATAHUB_API_KEY est configurée à vide', async () => {
    process.env.DATAHUB_API_KEY = ''
    const res = await mod.GET(req(stream, { authorization: '' }))
    expect(res.status).toBe(401)
  })

  it('accepte la clé valide', async () => {
    const res = await mod.GET(req(stream, { authorization: 'Bearer test-key' }))
    expect(res.status).toBe(200)
  })
})
