/**
 * @jest-environment node
 *
 * M13 / Data Hub — route d'export unique pilotée par le contrat (lot 5, spec §8.1).
 *
 * Une seule route sert les treize flux : ajouter un flux ne demande plus d'écrire de code
 * de route. Ces tests couvrent le contrat HTTP — refus, flux inconnu, curseur malformé,
 * pagination — le comportement d'extraction lui-même étant couvert unitairement.
 */
import { NextRequest } from 'next/server'

const mockFindMany = jest.fn()
const mockRecordAudit = jest.fn()
const mockRateLimit = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    candidature: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    opportuniteProgramme: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }))
jest.mock('@/lib/audit', () => ({ recordAudit: (...a: unknown[]) => mockRecordAudit(...a) }))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/v1/export/[stream]/route')

function req(stream: string, headers: Record<string, string> = {}, search = ''): NextRequest {
  return new NextRequest(`http://localhost/api/v1/export/${stream}${search}`, { headers })
}
const params = (stream: string) => ({ params: Promise.resolve({ stream }) })
const AUTH = { authorization: 'Bearer test-key' }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.DATAHUB_API_KEY = 'test-key'
  delete process.env.DATAHUB_API_KEYS
  mockRateLimit.mockResolvedValue(null)
  mockRecordAudit.mockResolvedValue(undefined)
  mockFindMany.mockResolvedValue([])
})

describe('GET /api/v1/export/[stream] — refus', () => {
  it('refuse sans clé API', async () => {
    const res = await route.GET(req('utilisateurs'), params('utilisateurs'))
    expect(res.status).toBe(401)
  })

  it("refuse quand aucune clé n'est configurée côté serveur, même sans en-tête", async () => {
    delete process.env.DATAHUB_API_KEY
    const res = await route.GET(req('utilisateurs'), params('utilisateurs'))
    expect(res.status).toBe(401)
  })

  it('refuse avant même d\'interroger la base', async () => {
    const res = await route.GET(req('utilisateurs'), params('utilisateurs'))
    expect(res.status).toBe(401)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('rend 404 sur un flux absent du contrat, sans divulguer les flux existants', async () => {
    const res = await route.GET(req('inconnu', AUTH), params('inconnu'))
    expect(res.status).toBe(404)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('rend 400 sur un curseur malformé, et non 500', async () => {
    // Valeur hors alphabet base64url mais transportable en query string — un `#` y serait
    // un délimiteur de fragment et n'atteindrait jamais le serveur.
    const res = await route.GET(req('utilisateurs', AUTH, '?cursor=pas.un.curseur'), params('utilisateurs'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('CURSEUR_INVALIDE')
  })

  it('rend 400 sur un since illisible, et non 500 (GUIC-696 S3)', async () => {
    // Avant correctif : `since` passait tel quel à `new Date(...)` dans keysetExport,
    // sans jamais être validé — une valeur illisible faisait échouer la requête à la
    // base, non interceptée en amont, et remontait en 500 (retriable pour le SDK Singer,
    // qui épuise ses tentatives avant d'abandonner le run).
    const res = await route.GET(req('utilisateurs', AUTH, '?since=pas-une-date'), params('utilisateurs'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BORNE_INVALIDE')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('rend 400 sur un since hors plage MariaDB, plutôt que d\'ignorer le filtre (GUIC-696 S2)', async () => {
    // `+275760-09-13` est une date JavaScript légale mais hors plage MariaDB DATETIME :
    // sans ce refus, la requête posée à la base ne filtrait plus rien et l'API rendait
    // 200 avec les premières lignes du flux, comme si `since` n'avait jamais été fourni.
    const res = await route.GET(
      req('utilisateurs', AUTH, '?since=%2B275760-09-13T00:00:00.000Z'),
      params('utilisateurs')
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BORNE_INVALIDE')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('laisse passer la réponse du limiteur de débit', async () => {
    mockRateLimit.mockResolvedValue(
      new Response(null, { status: 429 }) as unknown as Response
    )
    const res = await route.GET(req('utilisateurs', AUTH), params('utilisateurs'))
    expect(res.status).toBe(429)
  })
})

describe('GET /api/v1/export/[stream] — page servie', () => {
  it('projette les lignes selon le contrat et renseigne la pagination', async () => {
    mockFindMany.mockResolvedValue([
      { cjsUid: 'u1', region: 'Dakar', updatedAt: new Date('2026-07-01T00:00:00.000Z') },
    ])
    const res = await route.GET(req('utilisateurs', AUTH), params('utilisateurs'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toEqual([
      { cjs_uid: 'u1', region: 'Dakar', updated_at: '2026-07-01T00:00:00.000Z' },
    ])
    // GUIC-697 D1 — nom EXPORTÉ (`updated_at`), pas le nom Prisma : `data[]` porte déjà
    // `updated_at`, annoncer `updatedAt` en meta décrirait une colonne qui n'existe pas
    // dans la réponse.
    expect(body.meta.replication_key).toBe('updated_at')
    expect(body.meta.has_more).toBe(false)
    expect(body.meta.next_cursor).toBeNull()
  })

  it('interdit la mise en cache — sinon le tap boucle sur la même page', async () => {
    const res = await route.GET(req('utilisateurs', AUTH), params('utilisateurs'))
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('journalise chaque extraction pour la traçabilité CDP', async () => {
    mockFindMany.mockResolvedValue([{ cjsUid: 'u1', updatedAt: new Date('2026-07-01T00:00:00.000Z') }])
    await route.GET(req('candidatures', AUTH, '?since=2026-01-01T00:00:00.000Z'), params('candidatures'))

    expect(mockRecordAudit).toHaveBeenCalledWith(
      'datahub:datahub',
      'export.candidatures',
      expect.objectContaining({
        targetId: 'candidatures',
        meta: expect.objectContaining({ lignes: 1, since: '2026-01-01T00:00:00.000Z' }),
      })
    )
  })

  it('nomme le consommateur dans le journal quand la clé est nommée', async () => {
    process.env.DATAHUB_API_KEYS = 'meltano:s1'
    await route.GET(req('utilisateurs', { authorization: 'Bearer s1' }), params('utilisateurs'))
    expect(mockRecordAudit).toHaveBeenCalledWith(
      'datahub:meltano',
      'export.utilisateurs',
      expect.anything()
    )
  })

  it('applique le quota par consommateur et non par IP', async () => {
    await route.GET(req('utilisateurs', AUTH), params('utilisateurs'))
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ authenticated: true, keyPrefix: 'datahub:datahub' })
    )
  })
})

describe('GET /api/v1/export/[stream] — flux FULL_TABLE (GUIC-700 lot 7)', () => {
  it('sert un flux FULL_TABLE et projette selon son contrat', async () => {
    mockFindMany.mockResolvedValue([
      { opportuniteId: 'o1', programmeId: 'p1', principal: true },
    ])
    const res = await route.GET(req('opportunites_programmes', AUTH), params('opportunites_programmes'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toEqual([{ opportunite_id: 'o1', programme_id: 'p1', principal: true }])
    // Pas de replication_key : un flux FULL_TABLE n'a pas de watermark.
    expect(body.meta.replication_key).toBeUndefined()
  })

  it('ignore `since` sur un flux FULL_TABLE — aucun watermark à filtrer', async () => {
    await route.GET(
      req('opportunites_programmes', AUTH, '?since=2026-01-01T00:00:00.000Z'),
      params('opportunites_programmes')
    )
    // La requête construite ne doit porter aucun filtre lié à since.
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })

  it('rend 400 sur un curseur FULL_TABLE malformé, et non 500', async () => {
    const res = await route.GET(
      req('opportunites_programmes', AUTH, '?cursor=pas.un.curseur'),
      params('opportunites_programmes')
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('CURSEUR_INVALIDE')
  })

  it('journalise l\'extraction d\'un flux FULL_TABLE comme les autres', async () => {
    mockFindMany.mockResolvedValue([{ opportuniteId: 'o1', programmeId: 'p1', principal: true }])
    await route.GET(req('opportunites_programmes', AUTH), params('opportunites_programmes'))
    expect(mockRecordAudit).toHaveBeenCalledWith(
      'datahub:datahub',
      'export.opportunites_programmes',
      expect.objectContaining({ targetId: 'opportunites_programmes' })
    )
  })
})
