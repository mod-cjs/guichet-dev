/**
 * @jest-environment node
 *
 * GUIC-596 — US-1 Gestion des sources de veille : API admin CRUD.
 * INTÉGRATION RÉELLE : prisma NON mocké → écrit dans la vraie MariaDB
 * (docker guichet_mariadb, port 3307). Auth = bord mocké (pattern maison).
 *
 * Contrat (spec M3-curation-opportunites.md §4) :
 *   GET    /api/admin/sources-veille        → 200 liste paginée 20/page (hors soft-deleted)
 *   POST   /api/admin/sources-veille        → 201 · 400 zod · 409 URL déjà déclarée
 *   GET    /api/admin/sources-veille/[id]   → 200 · 404
 *   PATCH  /api/admin/sources-veille/[id]   → 200 · 400 patch vide · 404
 *   DELETE /api/admin/sources-veille/[id]   → 200 soft-delete (deletedAt)
 *   Toutes : 403 sans session admin. Mutations journalisées (audit_logs).
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

import { GET as listGET, POST as listPOST } from '@/app/api/admin/sources-veille/route'
import {
  GET as detailGET,
  PATCH as detailPATCH,
  DELETE as detailDELETE,
} from '@/app/api/admin/sources-veille/[id]/route'

const ADMIN = { cjsUid: 'test-admin-veille', roles: ['admin'] }
const PREFIX = 'test-guic596'
const BASE = 'http://localhost/api/admin/sources-veille'

function req(method: string, body?: unknown, url = BASE): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  })
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

function fixture(n: number) {
  return {
    nom: `${PREFIX} source ${n}`,
    url: `https://exemple-veille.sn/${PREFIX}/${n}`,
    methode: 'rss',
    frequence: 'quotidienne',
  }
}

afterEach(async () => {
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.auditLog.deleteMany({ where: { actorCjsUid: ADMIN.cjsUid } })
  jest.clearAllMocks()
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-596 — refus (chemins non-admin)', () => {
  it.each([
    ['sans session', null],
    ['rôle non-admin', { cjsUid: 'u-jeune', roles: ['jeune'] }],
  ])('403 sur toutes les routes — %s', async (_label, session) => {
    mockGetSession.mockResolvedValue(session)
    expect((await listGET(req('GET'))).status).toBe(403)
    expect((await listPOST(req('POST', fixture(1)))).status).toBe(403)
    expect((await detailGET(req('GET'), ctx('x'))).status).toBe(403)
    expect((await detailPATCH(req('PATCH', { actif: false }), ctx('x'))).status).toBe(403)
    expect((await detailDELETE(req('DELETE'), ctx('x'))).status).toBe(403)
  })
})

describe('GUIC-596 — CRUD sources de veille (DB réelle)', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(ADMIN))

  it('POST crée la source (201), persiste en base et journalise', async () => {
    const res = await listPOST(req('POST', fixture(1)))
    expect(res.status).toBe(201)
    const { data } = await res.json()
    expect(data.id).toBeTruthy()

    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.nom).toBe(`${PREFIX} source 1`)
    expect(row?.methode).toBe('rss')
    expect(row?.actif).toBe(true)
    expect(row?.deletedAt).toBeNull()

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'source_veille.create', targetId: data.id },
    })
    expect(audit?.actorCjsUid).toBe(ADMIN.cjsUid)
  })

  it('POST refuse un payload invalide (400) et une URL déjà déclarée (409)', async () => {
    expect((await listPOST(req('POST', { nom: 'x', url: 'nawak' }))).status).toBe(400)

    expect((await listPOST(req('POST', fixture(2)))).status).toBe(201)
    const dup = await listPOST(req('POST', { ...fixture(2), nom: `${PREFIX} autre nom` }))
    expect(dup.status).toBe(409)
    const body = await dup.json()
    expect(body.error.code).toBe('URL_EXISTANTE')
  })

  it('GET liste paginée 20/page, exclut les soft-deleted', async () => {
    await prisma.sourceVeille.createMany({
      data: Array.from({ length: 22 }, (_, i) => ({
        nom: `${PREFIX} bulk ${String(i).padStart(2, '0')}`,
        url: `https://exemple-veille.sn/${PREFIX}/bulk/${i}`,
        ...(i === 21 ? { deletedAt: new Date() } : {}),
      })),
    })

    const p1 = await (await listGET(req('GET', undefined, `${BASE}?page=1`))).json()
    expect(p1.meta).toMatchObject({ total: 21, page: 1, limit: 20 })
    expect(p1.data).toHaveLength(20)

    const p2 = await (await listGET(req('GET', undefined, `${BASE}?page=2`))).json()
    expect(p2.data).toHaveLength(1)
  })

  it('GET détail 200 · id inconnu 404', async () => {
    const { data } = await (await listPOST(req('POST', fixture(3)))).json()
    const detail = await detailGET(req('GET'), ctx(data.id))
    expect(detail.status).toBe(200)
    expect((await detail.json()).data.url).toBe(fixture(3).url)

    expect((await detailGET(req('GET'), ctx('00000000-0000-0000-0000-000000000000'))).status).toBe(404)
  })

  it('PATCH édite (dont toggle actif) et journalise · patch vide 400 · id inconnu 404', async () => {
    const { data } = await (await listPOST(req('POST', fixture(4)))).json()

    const res = await detailPATCH(req('PATCH', { actif: false, frequence: 'horaire' }), ctx(data.id))
    expect(res.status).toBe(200)
    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.actif).toBe(false)
    expect(row?.frequence).toBe('horaire')

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'source_veille.update', targetId: data.id },
    })
    expect(audit).not.toBeNull()

    expect((await detailPATCH(req('PATCH', {}), ctx(data.id))).status).toBe(400)
    expect(
      (await detailPATCH(req('PATCH', { actif: true }), ctx('00000000-0000-0000-0000-000000000000'))).status,
    ).toBe(404)
  })

  it('DELETE soft-delete : deletedAt posé, absent de la liste, journalisé', async () => {
    const { data } = await (await listPOST(req('POST', fixture(5)))).json()

    const res = await detailDELETE(req('DELETE'), ctx(data.id))
    expect(res.status).toBe(200)

    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.deletedAt).toBeInstanceOf(Date)

    const liste = await (await listGET(req('GET'))).json()
    expect(
      (liste.data as Array<{ id: string }>).find((s) => s.id === data.id),
    ).toBeUndefined()

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'source_veille.delete', targetId: data.id },
    })
    expect(audit).not.toBeNull()

    expect((await detailDELETE(req('DELETE'), ctx(data.id))).status).toBe(404)
  })
})
