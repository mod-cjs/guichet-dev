/**
 * @jest-environment node
 *
 * Tests des outils de l'agent Yaye (GUIC-259, Lot 0).
 * Vérifie la portée RBAC (cjsUid) et l'agrégation temps réel.
 */

const mockLoad = jest.fn()
jest.mock('@/lib/profil-loader', () => ({ loadProfilComplet: (...a: unknown[]) => mockLoad(...a) }))

const mockGroupBy = jest.fn()
const mockCandCount = jest.fn()
const mockCandFindMany = jest.fn()
const mockCount = jest.fn()
const mockFindMany = jest.fn()
const mockEvtFindMany = jest.fn()
const mockResFindMany = jest.fn()
const mockCentreFindMany = jest.fn()
const mockNotifFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: {
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
      count: (...a: unknown[]) => mockCandCount(...a),
      findMany: (...a: unknown[]) => mockCandFindMany(...a),
    },
    opportuniteFavorite: { count: (...a: unknown[]) => mockCount(...a) },
    opportunite: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    evenement: { findMany: (...a: unknown[]) => mockEvtFindMany(...a) },
    ressource: { findMany: (...a: unknown[]) => mockResFindMany(...a) },
    centre: { findMany: (...a: unknown[]) => mockCentreFindMany(...a) },
    notification: { findMany: (...a: unknown[]) => mockNotifFindMany(...a) },
  },
}))

const mockRecordEscalade = jest.fn()
jest.mock('@/lib/ia/escalade', () => ({
  recordEscalade: (...a: unknown[]) => mockRecordEscalade(...a),
  escaladeReference: (s: string) => `YAYE-${s.slice(-6).toUpperCase()}`,
}))
jest.mock('@/lib/app-url', () => ({ appUrl: () => 'https://app.test' }))

import { TOOLS, diversifyByType } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }

beforeEach(() => {
  mockLoad.mockReset()
  mockGroupBy.mockReset()
  mockCandCount.mockReset()
  mockCandFindMany.mockReset()
  mockCount.mockReset()
  mockFindMany.mockReset()
  mockEvtFindMany.mockReset()
  mockResFindMany.mockReset()
  mockCentreFindMany.mockReset()
  mockNotifFindMany.mockReset()
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

test('get_realtime_data : total candidatures + favoris + cards (statut en note)', async () => {
  mockCandCount.mockResolvedValueOnce(3)
  mockCandFindMany.mockResolvedValueOnce([
    {
      statut: 'En_attente',
      opportunite: { id: 'o1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi', region: 'Dakar', organisation: 'ACME', organisationLibelle: null, deadline: null, typeRef: null },
    },
  ])
  mockCount.mockResolvedValueOnce(5)

  const r = await TOOLS.get_realtime_data.execute({ scope: 'tout' }, ctx)

  expect(r.ok).toBe(true)
  const data = r.data as { candidatures: { total: number }; favoris: number }
  expect(data.candidatures.total).toBe(3)
  expect(data.favoris).toBe(5)
  // Les candidatures sortent en CARDS (statut porté sur la card via note), pas en prose.
  expect(r.block?.kind).toBe('opportunites')
  if (r.block?.kind === 'opportunites') {
    expect(r.block.items[0].slug).toBe('dev-web')
    expect(r.block.items[0].note).toBe('Candidature envoyée')
  }
  expect(mockCandCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cjsUid: 'u-1' } }))
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

describe('diversifyByType — mix de sous-catégories (anti « tout emploi »)', () => {
  it('entrelace les types au lieu de prendre 3 emplois', () => {
    const rows = [
      { type: 'Emploi', id: 'e1' }, { type: 'Emploi', id: 'e2' }, { type: 'Emploi', id: 'e3' },
      { type: 'Formation', id: 'f1' }, { type: 'Bourse', id: 'b1' },
    ]
    const out = diversifyByType(rows, 3)
    expect(out).toHaveLength(3)
    expect(new Set(out.map(r => r.type)).size).toBe(3) // 3 types distincts
    expect(out[0]).toEqual({ type: 'Emploi', id: 'e1' }) // ordre interne préservé
  })
  it('un seul type disponible → simple troncature', () => {
    const rows = [{ type: 'Emploi', id: 'e1' }, { type: 'Emploi', id: 'e2' }]
    expect(diversifyByType(rows, 3)).toHaveLength(2)
  })
})

test('search_events : événements à venir → bloc evenements cliquable', async () => {
  mockEvtFindMany.mockResolvedValueOnce([
    { id: 'ev1', titre: 'Atelier CV', type: 'Atelier', dateDebut: new Date('2026-09-10T14:00:00Z'), dateFin: null, lieu: 'Salle A', estGratuit: true, centre: { nom: 'CJS Dakar' } },
  ])
  const r = await TOOLS.search_events.execute({ type: 'Atelier' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block?.kind).toBe('evenements')
  if (r.block?.kind === 'evenements') {
    expect(r.block.items[0].id).toBe('ev1')
    expect(r.block.items[0].centre).toBe('CJS Dakar')
  }
  // filtre statut a_venir appliqué
  expect(mockEvtFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ statut: 'a_venir', type: 'Atelier' }),
  }))
})

test('search_events : aucun événement → pas de bloc', async () => {
  mockEvtFindMany.mockResolvedValueOnce([])
  const r = await TOOLS.search_events.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toBeUndefined()
})

test('search_resources : ressources publiques → bloc ressources', async () => {
  mockResFindMany.mockResolvedValueOnce([
    { id: 'r1', titre: 'Guide CV', type: 'Guide', theme: 'Emploi', niveau: null },
  ])
  const r = await TOOLS.search_resources.execute({ q: 'CV' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block?.kind).toBe('ressources')
  if (r.block?.kind === 'ressources') expect(r.block.items[0].id).toBe('r1')
  expect(mockResFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ estPublic: true }),
  }))
})

test('find_centres : centres actifs → bloc centres (services mappés)', async () => {
  mockCentreFindMany.mockResolvedValueOnce([
    { id: 'c1', slug: 'cjs-dakar', nom: 'CJS Dakar', ville: 'Dakar', region: 'Dakar', adresse: 'Rue 1', telephone: '+221...', services: ['WiFi', 'Conseiller'] },
  ])
  const r = await TOOLS.find_centres.execute({ region: 'Dakar' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block?.kind).toBe('centres')
  if (r.block?.kind === 'centres') {
    expect(r.block.items[0].slug).toBe('cjs-dakar')
    expect(r.block.items[0].services).toEqual(['WiFi', 'Conseiller'])
  }
  expect(mockCentreFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ estActif: true, region: 'Dakar' }),
  }))
})

test('get_notifications : scope cjsUid + non-lues comptées + bloc notifications', async () => {
  mockNotifFindMany.mockResolvedValueOnce([
    { id: 'n1', type: 'Deadline', titre: 'Échéance proche', contenu: 'Offre X ferme demain', lien: '/opportunites/x', metaPill: 'J-1', luA: null },
    { id: 'n2', type: 'Candidature', titre: 'Vue', contenu: 'Ta candidature a été vue', lien: null, metaPill: null, luA: new Date() },
  ])
  const r = await TOOLS.get_notifications.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { nonLues: number }).nonLues).toBe(1)
  expect(r.block?.kind).toBe('notifications')
  if (r.block?.kind === 'notifications') {
    expect(r.block.items[0].lu).toBe(false)
    expect(r.block.items[1].lu).toBe(true)
  }
  expect(mockNotifFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { cjsUid: 'u-1' } }))
})
