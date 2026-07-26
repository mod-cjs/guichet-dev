/**
 * @jest-environment node
 *
 * Tests des outils de réservation Yaye (GUIC-273, Lot 2) :
 * - get_reservable_resources : lecture seule, portée région, liens profonds.
 * - reserve_resource : récap AVANT écriture (confirm=false), écriture déléguée à
 *   l'endpoint EXISTANT via la passerelle (confirm=true), fallback web si non authentifié.
 * La passerelle est MOCKÉE : on ne teste pas ici l'endpoint existant (inchangé).
 */

const mockUserFind = jest.fn()
const mockResFindMany = jest.fn()
const mockResFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
    ressourceCentre: {
      findMany: (...a: unknown[]) => mockResFindMany(...a),
      findUnique: (...a: unknown[]) => mockResFindUnique(...a),
    },
  },
}))
jest.mock('@/lib/app-url', () => ({ appUrl: () => 'https://app.test' }))

const mockSubmit = jest.fn()
jest.mock('@/lib/ia/reservations-gateway', () => ({ submitReservationViaApi: (...a: unknown[]) => mockSubmit(...a) }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }
const VALID = { ressourceId: 'r1', date: '2026-07-01', creneauDebut: '10:00', creneauFin: '12:00', motif: 'Réunion de préparation projet associatif', nombrePersonnes: 5 }

beforeEach(() => {
  mockUserFind.mockReset()
  mockResFindMany.mockReset()
  mockResFindUnique.mockReset()
  mockSubmit.mockReset()
})

// ── get_reservable_resources ──────────────────────────────────────────────────

test('get_reservable_resources : borne à la région du bénéficiaire + liens profonds', async () => {
  mockUserFind.mockResolvedValueOnce({ region: 'Thies' })
  mockResFindMany.mockResolvedValueOnce([
    { id: 'r1', nom: 'Salle A', type: 'Salle', capacite: 20, capaciteUnit: 'personnes', dureeMinCreneauMin: 60, requiresJustif: false, centre: { nom: 'Centre Thiès', slug: 'centre-thies', region: 'Thies' } },
  ])

  const r = await TOOLS.get_reservable_resources.execute({ type: 'salle' }, ctx)

  expect(r.ok).toBe(true)
  const where = mockResFindMany.mock.calls[0][0].where
  expect(where.type.in).toEqual(['Salle'])
  expect(where.centre).toEqual({ region: 'Thies' })
  const data = r.data as { count: number; resources: { url: string }[] }
  expect(data.count).toBe(1)
  expect(data.resources[0].url).toBe('https://app.test/centres/centre-thies/ressources/r1/reserver')
  expect(r.block).toMatchObject({ kind: 'action' })
  expect((r.block as { buttons: { href: string }[] }).buttons[0].href).toBe('https://app.test/centres/centre-thies/ressources/r1/reserver')
})

test('get_reservable_resources : aucune ressource → pas de bloc', async () => {
  mockUserFind.mockResolvedValueOnce({ region: 'Dakar' })
  mockResFindMany.mockResolvedValueOnce([])
  const r = await TOOLS.get_reservable_resources.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { count: number }).count).toBe(0)
  expect(r.block).toBeUndefined()
})

// ── reserve_resource ──────────────────────────────────────────────────────────

test('reserve_resource : confirm absent → récapitulatif, AUCUNE écriture', async () => {
  mockResFindUnique.mockResolvedValueOnce({ nom: 'Salle A', type: 'Salle', estActive: true, requiresJustif: false, centre: { nom: 'Centre', slug: 'c' } })

  const r = await TOOLS.reserve_resource.execute({ ...VALID }, ctx)

  expect(r.ok).toBe(true)
  expect((r.data as { needsConfirmation: boolean }).needsConfirmation).toBe(true)
  expect(mockSubmit).not.toHaveBeenCalled()
  expect((r.block as { title: string }).title).toMatch(/Récapitulatif/)
  // Fix B (multi-tour) : le récap réémet les params EXACTS prêts à confirmer (confirm=true) →
  // le modèle les réutilise tels quels au tour « oui », sans les reconstruire.
  const ca = (r.data as { confirmArgs: Record<string, unknown> }).confirmArgs
  expect(ca).toMatchObject({ ressourceId: VALID.ressourceId, date: VALID.date, confirm: true })
})

test('reserve_resource : confirm=true → délègue à la passerelle + carte de confirmation', async () => {
  mockResFindUnique.mockResolvedValueOnce({ nom: 'Salle A', type: 'Salle', estActive: true, requiresJustif: false, centre: { nom: 'Centre', slug: 'c' } })
  mockSubmit.mockResolvedValueOnce({ ok: true, reservation: { id: 'res1', statut: 'Acceptee', centreId: 'c', ressourceId: 'r1', dateReservee: '2026-07-01T12:00:00.000Z', creneauDebut: '10:00', creneauFin: '12:00' } })

  const r = await TOOLS.reserve_resource.execute({ ...VALID, confirm: true }, ctx)

  expect(mockSubmit).toHaveBeenCalledWith(
    {
      ressourceId: 'r1',
      dateReservee: '2026-07-01T12:00:00.000Z',
      creneauDebut: '10:00',
      creneauFin: '12:00',
      nombrePersonnes: 5,
      motif: VALID.motif,
    },
    // Identité propagée : la réservation fonctionne aussi depuis WhatsApp (GUIC-678).
    ctx.cjsUid,
  )
  expect(r.ok).toBe(true)
  expect((r.data as { statut: string }).statut).toBe('Acceptee')
  expect((r.block as { title: string }).title).toMatch(/confirmée/)
})

test('reserve_resource : non authentifié (ex. WhatsApp) → bascule lien web', async () => {
  mockResFindUnique.mockResolvedValueOnce({ nom: 'Salle A', type: 'Salle', estActive: true, requiresJustif: false, centre: { nom: 'Centre', slug: 'c' } })
  mockSubmit.mockResolvedValueOnce({ ok: false, code: 'UNAUTHORIZED', message: 'Non authentifié', status: 401, unauthenticated: true })

  const r = await TOOLS.reserve_resource.execute({ ...VALID, confirm: true }, ctx)

  expect(r.ok).toBe(true)
  expect((r.data as { needsWeb: boolean }).needsWeb).toBe(true)
  expect((r.block as { buttons: { href: string }[] }).buttons[0].href).toBe('https://app.test/centres/c/ressources/r1/reserver')
})

test('reserve_resource : erreur métier de l’endpoint (créneau occupé) → ok:false', async () => {
  mockResFindUnique.mockResolvedValueOnce({ nom: 'Salle A', type: 'Salle', estActive: true, requiresJustif: false, centre: { nom: 'Centre', slug: 'c' } })
  mockSubmit.mockResolvedValueOnce({ ok: false, code: 'CRENEAU_OCCUPE', message: 'Ce créneau est déjà réservé.', status: 409, unauthenticated: false })

  const r = await TOOLS.reserve_resource.execute({ ...VALID, confirm: true }, ctx)

  expect(r.ok).toBe(false)
  expect(r.error).toMatch(/créneau/i)
})

test('reserve_resource : arguments incomplets → ok:false, pas de lookup', async () => {
  const r = await TOOLS.reserve_resource.execute({ ressourceId: '', date: 'mauvais', creneauDebut: 'x', creneauFin: 'y', motif: 'court' }, ctx)
  expect(r.ok).toBe(false)
  expect(mockResFindUnique).not.toHaveBeenCalled()
})

test('reserve_resource : ressource introuvable/inactive → ok:false', async () => {
  mockResFindUnique.mockResolvedValueOnce(null)
  const r = await TOOLS.reserve_resource.execute({ ...VALID }, ctx)
  expect(r.ok).toBe(false)
  expect(r.error).toMatch(/introuvable|indisponible/i)
})
