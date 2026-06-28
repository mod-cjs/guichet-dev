/**
 * @jest-environment node
 *
 * Tests des outils de l'agent Yaye (GUIC-259, Lot 0).
 * Vérifie la portée RBAC (cjsUid) et l'agrégation temps réel.
 */

const mockLoad = jest.fn()
jest.mock('@/lib/profil-loader', () => ({ loadProfilComplet: (...a: unknown[]) => mockLoad(...a) }))

const mockGroupBy = jest.fn()
const mockCount = jest.fn()
const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: { groupBy: (...a: unknown[]) => mockGroupBy(...a) },
    opportuniteFavorite: { count: (...a: unknown[]) => mockCount(...a) },
    opportunite: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}))

const mockRecordEscalade = jest.fn()
jest.mock('@/lib/ia/escalade', () => ({
  recordEscalade: (...a: unknown[]) => mockRecordEscalade(...a),
  escaladeReference: (s: string) => `YAYE-${s.slice(-6).toUpperCase()}`,
}))
jest.mock('@/lib/app-url', () => ({ appUrl: () => 'https://app.test' }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }

beforeEach(() => {
  mockLoad.mockReset()
  mockGroupBy.mockReset()
  mockCount.mockReset()
  mockFindMany.mockReset()
  mockRecordEscalade.mockReset()
})

test('get_user_profile : renvoie le profil du cjsUid en portée', async () => {
  mockLoad.mockResolvedValueOnce({ cjsUid: 'u-1', region: 'Dakar' })
  const r = await TOOLS.get_user_profile.execute({}, ctx)
  expect(mockLoad).toHaveBeenCalledWith('u-1')
  expect(r.ok).toBe(true)
})

test('get_user_profile : profil introuvable → ok:false', async () => {
  mockLoad.mockResolvedValueOnce(null)
  const r = await TOOLS.get_user_profile.execute({}, ctx)
  expect(r.ok).toBe(false)
})

test('get_realtime_data : agrège candidatures (par statut) + favoris', async () => {
  mockGroupBy.mockResolvedValueOnce([
    { statut: 'En_attente', _count: { _all: 2 } },
    { statut: 'Vue', _count: { _all: 1 } },
  ])
  mockCount.mockResolvedValueOnce(5)

  const r = await TOOLS.get_realtime_data.execute({ scope: 'tout' }, ctx)

  expect(r.ok).toBe(true)
  const data = r.data as { candidatures: { total: number; parStatut: Record<string, number> }; favoris: number }
  expect(data.candidatures.total).toBe(3)
  expect(data.candidatures.parStatut.En_attente).toBe(2)
  expect(data.favoris).toBe(5)
  expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { cjsUid: 'u-1' } }))
})

test('search_opportunities : renvoie un bloc opportunites cliquable', async () => {
  mockFindMany.mockResolvedValueOnce([
    {
      id: 'o1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi',
      region: 'Dakar', organisation: 'ACME', organisationLibelle: null, deadline: new Date('2026-12-01'),
    },
  ])
  const r = await TOOLS.search_opportunities.execute({ domaine: 'Numerique' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block?.kind).toBe('opportunites')
  if (r.block?.kind === 'opportunites') {
    expect(r.block.items[0].slug).toBe('dev-web')
    expect(r.block.items[0].organisation).toBe('ACME')
  }
  // l'enum domaine valide est bien appliqué au filtre Prisma
  expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ statut: 'publiee', domaine: 'Numerique' }),
  }))
})

test('search_opportunities : aucun résultat → pas de bloc', async () => {
  mockFindMany.mockResolvedValueOnce([])
  const r = await TOOLS.search_opportunities.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toBeUndefined()
})

test('search_opportunities : enum invalide ignoré (pas de crash Prisma)', async () => {
  mockFindMany.mockResolvedValueOnce([])
  await TOOLS.search_opportunities.execute({ domaine: 'PasUnDomaine' }, ctx)
  const where = mockFindMany.mock.calls[0][0].where
  expect(where.domaine).toBeUndefined() // valeur invalide non transmise à Prisma
})

// ── escalate_to_advisor (Lot 6) ────────────────────────────────────────────

test('escalate_to_advisor : journalise l’escalade (recordEscalade) + bloc escalade avec référence', async () => {
  mockRecordEscalade.mockResolvedValueOnce({ reference: 'YAYE-ABC123', alreadyPending: false })
  const r = await TOOLS.escalate_to_advisor.execute(
    { motif: 'sujet_sensible', resume: 'situation personnelle difficile' },
    { ...ctx, sessionId: 's-1', canal: 'web' },
  )
  expect(r.ok).toBe(true)
  expect(mockRecordEscalade).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionId: 's-1', canal: 'web', cjsUid: 'u-1', raison: 'sujet_sensible',
      stade: 'situation personnelle difficile',
    }),
  )
  expect(r.block?.kind).toBe('escalade')
  // Suivi : la référence est restituée (data + bloc dédié) pour que la personne puisse la rappeler.
  expect((r.data as { reference?: string })?.reference).toBe('YAYE-ABC123')
  expect(r.block && 'reference' in r.block ? r.block.reference : '').toBe('YAYE-ABC123')
})

test('escalate_to_advisor : escalade déjà en cours → titre adapté', async () => {
  mockRecordEscalade.mockResolvedValueOnce({ reference: 'YAYE-ABC123', alreadyPending: true })
  const r = await TOOLS.escalate_to_advisor.execute(
    { motif: 'demande_explicite' },
    { ...ctx, sessionId: 's-1', canal: 'web' },
  )
  expect(r.block && 'title' in r.block ? r.block.title : '').toMatch(/déjà/i)
})

test('escalate_to_advisor : sans session/canal → ok:false, aucune trace', async () => {
  const r = await TOOLS.escalate_to_advisor.execute({ motif: 'autre' }, ctx)
  expect(r.ok).toBe(false)
  expect(mockRecordEscalade).not.toHaveBeenCalled()
})

test('escalate_to_advisor : signal_danger → dangerSignal transmis + force sujet_sensible', async () => {
  mockRecordEscalade.mockResolvedValueOnce({ reference: 'YAYE-DGR001', alreadyPending: false })
  await TOOLS.escalate_to_advisor.execute(
    { motif: 'demande_complexe', signal_danger: 'harcelement' },
    { ...ctx, sessionId: 's-9', canal: 'web' },
  )
  expect(mockRecordEscalade).toHaveBeenCalledWith(
    expect.objectContaining({ dangerSignal: 'harcelement', raison: 'sujet_sensible' }),
  )
})

test('escalate_to_advisor : signal_danger inconnu ignoré (dangerSignal=null)', async () => {
  mockRecordEscalade.mockResolvedValueOnce({ reference: 'YAYE-X', alreadyPending: false })
  await TOOLS.escalate_to_advisor.execute(
    { motif: 'sujet_sensible', signal_danger: 'n_importe_quoi' },
    { ...ctx, sessionId: 's-10', canal: 'web' },
  )
  expect(mockRecordEscalade).toHaveBeenCalledWith(expect.objectContaining({ dangerSignal: null }))
})

test('escalate_to_advisor : motif inconnu normalisé en "autre"', async () => {
  mockRecordEscalade.mockResolvedValueOnce({ reference: 'YAYE-XYZ789', alreadyPending: false })
  await TOOLS.escalate_to_advisor.execute(
    { motif: 'n_importe_quoi' },
    { ...ctx, sessionId: 's-2', canal: 'whatsapp' },
  )
  expect(mockRecordEscalade).toHaveBeenCalledWith(expect.objectContaining({ raison: 'autre' }))
})
