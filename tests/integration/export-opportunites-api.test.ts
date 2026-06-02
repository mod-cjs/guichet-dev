/**
 * @jest-environment node
 *
 * Tests d'intégration `GET /api/v1/export/opportunites` (M13 / GUIC-184 — 178c/4).
 * Prisma est mocké ; l'auth Bearer + le mapping DTO aplati sont exercés réellement.
 */
import { NextRequest } from 'next/server'

const mockFindMany = jest.fn()
const mockCount = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/v1/export/opportunites/route')

const NOW = new Date('2026-06-01T10:00:00.000Z')

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'opp-1',
    drupalNid: null,
    slug: 'mon-opp',
    titre: 'Mon opp',
    description: 'desc',
    type: 'Stage',
    organisation: 'CJS legacy',
    typeId: null,
    programmeId: null,
    organisationLibelle: null,
    niveauEtudeMin: null,
    domaine: 'Numerique',
    region: 'Dakar',
    organisationId: null,
    remuneration: null,
    deadline: null,
    lienExterne: null,
    statut: 'publiee',
    recruteurUid: null,
    vues: 0,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    typeRef: null,
    programme: null,
    emploi: null,
    stage: null,
    formation: null,
    bourse: null,
    concours: null,
    appelAProjets: null,
    financement: null,
    mentorat: null,
    mobilite: null,
    volontariat: null,
    skills: [],
    tags: [],
    ...overrides,
  }
}

function req(headers: Record<string, string> = {}, search = ''): NextRequest {
  return new NextRequest(`http://localhost/api/v1/export/opportunites${search}`, { headers })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.DATAHUB_API_KEY = 'test-key'
  mockFindMany.mockResolvedValue([row()])
  mockCount.mockResolvedValue(1)
})

describe('GET /api/v1/export/opportunites', () => {
  it('refuse sans clé API', async () => {
    const res = await route.GET(req())
    expect(res.status).toBe(401)
  })

  it('refuse une clé API invalide', async () => {
    const res = await route.GET(req({ authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it('refuse si DATAHUB_API_KEY non configurée côté serveur', async () => {
    delete process.env.DATAHUB_API_KEY
    const res = await route.GET(req({ authorization: 'Bearer anything' }))
    expect(res.status).toBe(401)
  })

  it('renvoie 200 + payload aplati pour une row legacy (type dérivé en lowercase)', async () => {
    const res = await route.GET(req({ authorization: 'Bearer test-key' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta).toEqual({ total: 1, generated_at: expect.any(String) })
    expect(body.data).toHaveLength(1)
    const item = body.data[0]
    expect(item.id).toBe('opp-1')
    expect(item.type).toBe('stage')
    expect(item.programme_slug).toBeNull()
    // Toutes les colonnes sous-type présentes à null
    expect(item.emploi_type_contrat).toBeNull()
    expect(item.stage_duree_mois).toBeNull()
    expect(item.bourse_montant_total_fcfa).toBeNull()
    expect(item.volontariat_type_volontariat).toBeNull()
  })

  it('aplati un EMPLOI migré avec préfixes corrects et type slug', async () => {
    mockFindMany.mockResolvedValue([row({
      typeRef: {
        id: 't1', slug: 'emploi', libelle: 'Emploi', actionLabel: 'Postuler',
        requiresFileUpload: true, fileLabel: 'CV', decisionAuthority: null, actif: true, ordre: 0,
        createdAt: NOW, updatedAt: NOW,
      },
      programme: {
        id: 'p1', slug: 'yaakaar', nom: 'Yaakaar', description: 'd',
        gradientToken: 'tk', actif: true, createdAt: NOW, updatedAt: NOW,
      },
      emploi: {
        opportuniteId: 'opp-1', typeContrat: 'CDI', dureeContratMois: 12,
        experienceRequise: '2 ans', teletravail: true, niveauEtudeMin: 'BAC_PLUS_3',
      },
    })])
    const res = await route.GET(req({ authorization: 'Bearer test-key' }))
    const body = await res.json()
    expect(body.data[0].type).toBe('emploi')
    expect(body.data[0].programme_slug).toBe('yaakaar')
    expect(body.data[0].emploi_type_contrat).toBe('CDI')
    expect(body.data[0].emploi_teletravail).toBe(true)
    expect(body.data[0].stage_duree_mois).toBeNull()
  })

  it('respecte limit + offset (bornés 1..1000)', async () => {
    await route.GET(req({ authorization: 'Bearer test-key' }, '?limit=50&offset=100'))
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50, skip: 100 }))
  })

  it('limit borné à 1000', async () => {
    await route.GET(req({ authorization: 'Bearer test-key' }, '?limit=99999'))
    expect(mockFindMany.mock.calls[0][0].take).toBe(1000)
  })

  it('exclut les opportunités soft-deleted', async () => {
    await route.GET(req({ authorization: 'Bearer test-key' }))
    expect(mockFindMany.mock.calls[0][0].where).toEqual({ deletedAt: null })
    expect(mockCount.mock.calls[0][0].where).toEqual({ deletedAt: null })
  })
})
