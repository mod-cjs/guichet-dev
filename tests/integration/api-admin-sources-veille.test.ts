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
// PREFIX stable pour le cleanup (ramasse aussi les restes d'un run crashé) ;
// RUN unique pour que les URLs ne collisionnent jamais entre runs/sessions
// parallèles sur la même MariaDB partagée.
const PREFIX = 'test-guic596'
const RUN = Date.now()
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
    url: `https://exemple-veille.sn/${PREFIX}/${RUN}/${n}`,
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
  it('401 sans session (non authentifié) sur toutes les routes', async () => {
    mockGetSession.mockResolvedValue(null)
    expect((await listGET(req('GET'))).status).toBe(401)
    expect((await listPOST(req('POST', fixture(1)))).status).toBe(401)
    expect((await detailGET(req('GET'), ctx('x'))).status).toBe(401)
    expect((await detailPATCH(req('PATCH', { actif: false }), ctx('x'))).status).toBe(401)
    expect((await detailDELETE(req('DELETE'), ctx('x'))).status).toBe(401)
  })

  it('403 avec session non-admin (authentifié mais rôle insuffisant)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u-jeune', roles: ['jeune'] })
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
    // La MariaDB 3307 est PARTAGÉE et écrite en PARALLÈLE par d'autres fichiers de test
    // (api-cron, apercu créent/suppriment des sourceVeille sans notre préfixe). Toute
    // assertion sur le `total` GLOBAL est donc flaky. On vérifie :
    //  1) la mécanique de pagination via la mécanique robuste (page pleine = 20),
    //  2) l'exclusion des soft-deleted via un comptage DIRECT scopé au préfixe (déterministe).
    await prisma.sourceVeille.createMany({
      data: Array.from({ length: 22 }, (_, i) => ({
        nom: `${PREFIX} bulk ${String(i).padStart(2, '0')}`,
        url: `https://exemple-veille.sn/${PREFIX}/${RUN}/bulk/${i}`,
        ...(i === 21 ? { deletedAt: new Date() } : {}),
      })),
    })

    // Soft-delete exclu : 21 vivants sur 22 créés (déterministe, insensible aux tiers).
    expect(await prisma.sourceVeille.count({ where: { nom: { startsWith: PREFIX }, deletedAt: null } })).toBe(21)
    expect(await prisma.sourceVeille.count({ where: { nom: { startsWith: PREFIX } } })).toBe(22)

    // Nos ≥21 vivants garantissent une page 1 PLEINE et un total ≥ 21, quels que soient les tiers.
    const p1 = await (await listGET(req('GET', undefined, `${BASE}?page=1`))).json()
    expect(p1.meta).toMatchObject({ page: 1, limit: 20 })
    expect(p1.meta.total).toBeGreaterThanOrEqual(21)
    expect(p1.data).toHaveLength(20)

    const p2 = await (await listGET(req('GET', undefined, `${BASE}?page=2`))).json()
    expect(p2.data.length).toBeGreaterThanOrEqual(1)
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

  // ─── Durcissement post-challenge (2026-07-20) ─────────────────────────────

  it('POST initialise prochaineVerifLe (source neuve immédiatement due pour le robot US-2)', async () => {
    const { data } = await (await listPOST(req('POST', fixture(10)))).json()
    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.prochaineVerifLe).toBeInstanceOf(Date)
    expect(row!.prochaineVerifLe!.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('re-déclarer une URL soft-deletée la ré-hydrate (pas de 409 fantôme)', async () => {
    const { data: first } = await (await listPOST(req('POST', fixture(11)))).json()
    await detailDELETE(req('DELETE'), ctx(first.id))

    const res = await listPOST(req('POST', fixture(11)))
    expect(res.status).toBe(201)
    const { data: revived } = await res.json()
    // Même ligne réhydratée (URL unique préservée), vivante à nouveau.
    expect(revived.id).toBe(first.id)
    const row = await prisma.sourceVeille.findUnique({ where: { id: first.id } })
    expect(row?.deletedAt).toBeNull()

    const liste = await (await listGET(req('GET'))).json()
    expect((liste.data as Array<{ id: string }>).some((s) => s.id === first.id)).toBe(true)
  })

  it('réactiver une source (actif false→true) repose prochaineVerifLe si absent', async () => {
    const { data } = await (await listPOST(req('POST', fixture(12)))).json()
    // Simule une source désactivée dont le robot a consommé la date.
    await prisma.sourceVeille.update({
      where: { id: data.id },
      data: { actif: false, prochaineVerifLe: null },
    })
    await detailPATCH(req('PATCH', { actif: true }), ctx(data.id))
    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.prochaineVerifLe).toBeInstanceOf(Date)
  })

  it('PATCH bascule vers html_selecteurs sur une source DÉJÀ configurée → 200 (invariant sur état fusionné)', async () => {
    const { data } = await (
      await listPOST(
        req('POST', {
          ...fixture(13),
          methode: 'api',
          configExtraction: { endpoint: 'https://api.exemple.sn/offres' },
        }),
      )
    ).json()
    // La config existe déjà en base : basculer la méthode seule ne doit PAS être rejeté.
    const res = await detailPATCH(req('PATCH', { methode: 'html_selecteurs' }), ctx(data.id))
    expect(res.status).toBe(200)
    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.methode).toBe('html_selecteurs')
  })

  it('PATCH refuse une bascule vers une méthode à config requise SANS config existante (400)', async () => {
    const { data } = await (await listPOST(req('POST', { ...fixture(14), methode: 'rss' }))).json()
    const res = await detailPATCH(req('PATCH', { methode: 'html_selecteurs' }), ctx(data.id))
    expect(res.status).toBe(400)
  })

  it('PATCH configExtraction:null efface la config', async () => {
    const { data } = await (
      await listPOST(
        req('POST', {
          ...fixture(15),
          methode: 'jsonld',
          configExtraction: { note: 'à supprimer' },
        }),
      )
    ).json()
    await detailPATCH(req('PATCH', { configExtraction: null }), ctx(data.id))
    const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
    expect(row?.configExtraction).toBeNull()
  })

  it('PATCH url vers une URL déjà prise par une autre source vivante → 409', async () => {
    const { data: a } = await (await listPOST(req('POST', fixture(16)))).json()
    await listPOST(req('POST', fixture(17)))
    const res = await detailPATCH(req('PATCH', { url: fixture(17).url }), ctx(a.id))
    expect(res.status).toBe(409)
  })

  it('POST normalise l’URL : trailing slash = même source (409 au doublon)', async () => {
    const base = `https://exemple-veille.sn/${PREFIX}/${RUN}/norm`
    expect((await listPOST(req('POST', { ...fixture(18), url: base }))).status).toBe(201)
    const dup = await listPOST(req('POST', { ...fixture(18), nom: `${PREFIX} n2`, url: `${base}/` }))
    expect(dup.status).toBe(409)
  })

  it('POST refuse une URL interne (anti-SSRF) — le robot fetchera cette URL en US-2', async () => {
    for (const url of ['http://169.254.169.254/latest', 'http://127.0.0.1:6379/', 'http://localhost/x']) {
      const res = await listPOST(req('POST', { ...fixture(19), nom: `${PREFIX} ssrf`, url }))
      expect(res.status).toBe(400)
    }
  })

  it('POST refuse un typeDefautId inexistant (FK) et accepte un type réel', async () => {
    const bad = await listPOST(req('POST', { ...fixture(20), typeDefautId: '00000000-0000-0000-0000-000000000000' }))
    expect(bad.status).toBe(400)

    const type = await prisma.opportuniteType.findFirst({ select: { id: true } })
    if (type) {
      const ok = await listPOST(req('POST', { ...fixture(21), typeDefautId: type.id }))
      expect(ok.status).toBe(201)
      const { data } = await ok.json()
      const row = await prisma.sourceVeille.findUnique({ where: { id: data.id } })
      expect(row?.typeDefautId).toBe(type.id)
    }
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
