/**
 * @jest-environment node
 *
 * Outils Yaye branchés sur l'EXISTANT (GUIC-294 Lot 4 + F6) :
 * - get_badge → endpoint EXISTANT /api/cjs-card/qr-token (JWT) + lien ma-carte.
 * - submit_application → route EXISTANTE POST /api/candidatures (récap puis confirm=true),
 *   CV réutilisé depuis le profil, gestion déjà-postulé / profil incomplet / fallback web.
 * Les endpoints et l'invocateur interne sont MOCKÉS : on teste la couche Yaye, pas les services.
 */

const mockOppFindFirst = jest.fn()
const mockProfilFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findFirst: (...a: unknown[]) => mockOppFindFirst(...a) },
    profilJeune: { findUnique: (...a: unknown[]) => mockProfilFind(...a) },
  },
}))
jest.mock('@/lib/app-url', () => ({ appUrl: () => 'https://app.test' }))
// Stubs des routes existantes (évite de charger leurs dépendances réelles dans le test).
jest.mock('@/app/api/cjs-card/qr-token/route', () => ({ GET: jest.fn() }))
jest.mock('@/app/api/candidatures/route', () => ({ POST: jest.fn() }))
jest.mock('@/lib/ia/reservations-gateway', () => ({ submitReservationViaApi: jest.fn() }))

const mockCall = jest.fn()
jest.mock('@/lib/ia/internal-api', () => ({ callInternalRoute: (...a: unknown[]) => mockCall(...a) }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }
const LETTRE = 'a'.repeat(300)

beforeEach(() => {
  jest.clearAllMocks()
})

// ── get_badge ─────────────────────────────────────────────────────────────────

test('get_badge : badge dispo → carte action vers /jeune/ma-carte', async () => {
  mockCall.mockResolvedValueOnce({ ok: true, status: 200, json: { data: { token: 'jwt', expiresAt: '2026-07-01T00:00:00Z' } }, unauthenticated: false })

  const r = await TOOLS.get_badge.execute({}, ctx)

  // `actorCjsUid` : identité propagée à l'appel interne → l'outil marche aussi hors web (GUIC-678).
  expect(mockCall.mock.calls[0][1]).toEqual({ method: 'GET', path: '/api/cjs-card/qr-token', actorCjsUid: ctx.cjsUid })
  expect(r.ok).toBe(true)
  expect((r.block as { buttons: { href: string }[] }).buttons[0].href).toBe('https://app.test/jeune/ma-carte')
})

test('get_badge : non authentifié → fallback lien web', async () => {
  mockCall.mockResolvedValueOnce({ ok: false, status: 401, json: { error: { message: 'Non authentifié' } }, unauthenticated: true })
  const r = await TOOLS.get_badge.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { needsWeb: boolean }).needsWeb).toBe(true)
})

test('get_badge : erreur endpoint → ok:false', async () => {
  mockCall.mockResolvedValueOnce({ ok: false, status: 500, json: { error: { message: 'boom' } }, unauthenticated: false })
  const r = await TOOLS.get_badge.execute({}, ctx)
  expect(r.ok).toBe(false)
})

// ── submit_application ──────────────────────────────────────────────────────────

test('submit_application : confirm absent → récap, AUCUNE soumission', async () => {
  mockOppFindFirst.mockResolvedValueOnce({ slug: 'stage-x', titre: 'Stage X', organisation: 'ACME', organisationLibelle: null })
  mockProfilFind.mockResolvedValueOnce({ cvUrl: 'https://s.blob.vercel-storage.com/cv.pdf' })

  const r = await TOOLS.submit_application.execute({ opportuniteId: 'o1', lettreMotivation: LETTRE }, ctx)

  expect(r.ok).toBe(true)
  expect((r.data as { needsConfirmation: boolean }).needsConfirmation).toBe(true)
  expect(mockCall).not.toHaveBeenCalled()
  expect((r.block as { title: string }).title).toMatch(/Récapitulatif/)
})

test('submit_application : confirm=true → POST /api/candidatures avec CV du profil', async () => {
  mockOppFindFirst.mockResolvedValueOnce({ slug: 'stage-x', titre: 'Stage X', organisation: 'ACME', organisationLibelle: null })
  mockProfilFind.mockResolvedValueOnce({ cvUrl: 'https://s.blob.vercel-storage.com/cv.pdf' })
  mockCall.mockResolvedValueOnce({ ok: true, status: 201, json: { data: { id: 'c1' } }, unauthenticated: false })

  const r = await TOOLS.submit_application.execute({ opportuniteId: 'o1', lettreMotivation: LETTRE, notificationsConsent: true, confirm: true }, ctx)

  expect(mockCall.mock.calls[0][1]).toEqual({
    method: 'POST',
    path: '/api/candidatures',
    body: { opportuniteId: 'o1', lettreMotivation: LETTRE, cvUrl: 'https://s.blob.vercel-storage.com/cv.pdf', notificationsConsent: true },
    actorCjsUid: ctx.cjsUid,
  })
  expect(r.ok).toBe(true)
  expect((r.block as { title: string }).title).toMatch(/envoyée/)
})

test('submit_application : lettre trop courte → ok:false, pas de lookup', async () => {
  const r = await TOOLS.submit_application.execute({ opportuniteId: 'o1', lettreMotivation: 'court' }, ctx)
  expect(r.ok).toBe(false)
  expect(mockOppFindFirst).not.toHaveBeenCalled()
})

test('submit_application : déjà postulé (409) → message dédié', async () => {
  mockOppFindFirst.mockResolvedValueOnce({ slug: 's', titre: 'Stage X', organisation: 'ACME', organisationLibelle: null })
  mockProfilFind.mockResolvedValueOnce({ cvUrl: null })
  mockCall.mockResolvedValueOnce({ ok: false, status: 409, json: { error: { code: 'ALREADY_APPLIED', message: 'déjà' } }, unauthenticated: false })

  const r = await TOOLS.submit_application.execute({ opportuniteId: 'o1', lettreMotivation: LETTRE, confirm: true }, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { alreadyApplied: boolean }).alreadyApplied).toBe(true)
})

test('submit_application : profil incomplet (403) → invite à compléter', async () => {
  mockOppFindFirst.mockResolvedValueOnce({ slug: 's', titre: 'Stage X', organisation: 'ACME', organisationLibelle: null })
  mockProfilFind.mockResolvedValueOnce({ cvUrl: null })
  mockCall.mockResolvedValueOnce({ ok: false, status: 403, json: { error: { code: 'PROFILE_INCOMPLETE', message: 'Complétez : téléphone' } }, unauthenticated: false })

  const r = await TOOLS.submit_application.execute({ opportuniteId: 'o1', lettreMotivation: LETTRE, confirm: true }, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { profileIncomplete: boolean }).profileIncomplete).toBe(true)
  expect((r.block as { buttons: { href: string }[] }).buttons[0].href).toBe('https://app.test/jeune/mon-profil')
})

test('submit_application : opportunité introuvable → ok:false', async () => {
  mockOppFindFirst.mockResolvedValueOnce(null)
  const r = await TOOLS.submit_application.execute({ opportuniteId: 'o1', lettreMotivation: LETTRE }, ctx)
  expect(r.ok).toBe(false)
})
