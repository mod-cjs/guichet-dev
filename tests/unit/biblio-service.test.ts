/**
 * @jest-environment node
 *
 * Tests du service métier bibliothèque (Lot 3, GUIC-274/341/342/343/345).
 * Cycle : recherche → emprunt initié → confirmation (scan badge staff) → retour,
 * transitions de statut d'exemplaire, RBAC centre du staff, anti-doublon, erreurs.
 * Prisma et la projection Neo4j sont MOCKÉS.
 */

const mockLivreFindMany = jest.fn()
const mockLivreCount = jest.fn()
const mockLivreFindUnique = jest.fn()
const mockExFindUnique = jest.fn()
const mockExUpdate = jest.fn()
const mockEmpFindFirst = jest.fn()
const mockEmpCreate = jest.fn()
const mockEmpFindUnique = jest.fn()
const mockEmpFindUniqueOrThrow = jest.fn()
const mockEmpUpdate = jest.fn()
const mockEmpFindMany = jest.fn()
const mockTransaction = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    livre: {
      findMany: (...a: unknown[]) => mockLivreFindMany(...a),
      count: (...a: unknown[]) => mockLivreCount(...a),
      findUnique: (...a: unknown[]) => mockLivreFindUnique(...a),
    },
    exemplaire: {
      findUnique: (...a: unknown[]) => mockExFindUnique(...a),
      update: (...a: unknown[]) => mockExUpdate(...a),
    },
    emprunt: {
      findFirst: (...a: unknown[]) => mockEmpFindFirst(...a),
      create: (...a: unknown[]) => mockEmpCreate(...a),
      findUnique: (...a: unknown[]) => mockEmpFindUnique(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockEmpFindUniqueOrThrow(...a),
      update: (...a: unknown[]) => mockEmpUpdate(...a),
      findMany: (...a: unknown[]) => mockEmpFindMany(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}))

// Projection Neo4j fire-and-forget — neutralisée (read-model reconstructible).
jest.mock('@/lib/ia/graph/projection/project', () => ({
  syncExemplaireToGraph: jest.fn(),
  syncLivreToGraph: jest.fn(),
  syncExemplaireDeletion: jest.fn(),
}))

import {
  searchLivres,
  initierEmprunt,
  confirmerEmprunt,
  retournerEmprunt,
  getEmpruntsActifs,
  BiblioDomainError,
  DUREE_EMPRUNT_JOURS,
} from '@/lib/bibliotheque/service'

/** Fabrique un tx mappé sur les mocks (le callback de $transaction reçoit ce tx). */
function makeTx() {
  return {
    exemplaire: { findUnique: mockExFindUnique, update: mockExUpdate },
    emprunt: { findFirst: mockEmpFindFirst, create: mockEmpCreate, findUnique: mockEmpFindUnique, update: mockEmpUpdate },
  }
}

const empruntRow = (over: Record<string, unknown> = {}) => ({
  id: 'e1',
  statut: 'initie',
  initieA: new Date('2026-06-25T10:00:00Z'),
  confirmeA: null,
  dateRetourPrevue: null,
  renduA: null,
  exemplaire: {
    id: 'ex1',
    codeBarre: 'CB-1',
    centreId: 'c1',
    rayon: 'A',
    etagere: 'B',
    position: '3',
    centre: { nom: 'Centre Test' },
    livre: { id: 'l1', titre: 'Le Petit Prince', auteur: 'Saint-Exupéry' },
  },
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(makeTx()))
})

// ── Recherche (GUIC-342) ──────────────────────────────────────────────────────

test('searchLivres : calcule exemplaires disponibles + emplacements (dispo seulement)', async () => {
  mockLivreCount.mockResolvedValueOnce(1)
  mockLivreFindMany.mockResolvedValueOnce([
    {
      id: 'l1', titre: 'T', auteur: 'A', isbn: null, theme: 'Sciences', niveau: null, langue: 'fr',
      resume: null, couvertureUrl: null,
      exemplaires: [
        { id: 'ex1', centreId: 'c1', rayon: 'A', etagere: 'B', position: '1', statut: 'disponible', centre: { nom: 'C1' } },
        { id: 'ex2', centreId: 'c1', rayon: 'A', etagere: 'B', position: '2', statut: 'emprunte', centre: { nom: 'C1' } },
      ],
    },
  ])
  const r = await searchLivres({ q: 'T' })
  expect(r.total).toBe(1)
  expect(r.livres[0].exemplairesTotal).toBe(2)
  expect(r.livres[0].exemplairesDisponibles).toBe(1)
  expect(r.livres[0].emplacements).toHaveLength(1)
  expect(r.livres[0].emplacements[0].exemplaireId).toBe('ex1')
})

// ── Emprunt initié (GUIC-343) ─────────────────────────────────────────────────

test('initierEmprunt : exemplaire disponible → emprunt initie + exemplaire reserve', async () => {
  mockExFindUnique.mockResolvedValueOnce({ id: 'ex1', statut: 'disponible' })
  mockEmpFindFirst.mockResolvedValueOnce(null)
  mockEmpCreate.mockResolvedValueOnce({ id: 'e1' })
  mockEmpFindUniqueOrThrow.mockResolvedValueOnce(empruntRow())

  const r = await initierEmprunt({ cjsUid: 'u1', exemplaireId: 'ex1' })

  expect(r.statut).toBe('initie')
  expect(mockExUpdate).toHaveBeenCalledWith({ where: { id: 'ex1' }, data: { statut: 'reserve' } })
})

test('initierEmprunt : exemplaire indisponible → EXEMPLAIRE_INDISPONIBLE', async () => {
  mockExFindUnique.mockResolvedValueOnce({ id: 'ex1', statut: 'emprunte' })
  await expect(initierEmprunt({ cjsUid: 'u1', exemplaireId: 'ex1' })).rejects.toMatchObject({
    code: 'EXEMPLAIRE_INDISPONIBLE',
  })
  expect(mockEmpCreate).not.toHaveBeenCalled()
})

test('initierEmprunt : doublon actif du même usager → DOUBLON_EMPRUNT', async () => {
  mockExFindUnique.mockResolvedValueOnce({ id: 'ex1', statut: 'disponible' })
  mockEmpFindFirst.mockResolvedValueOnce({ id: 'deja' })
  await expect(initierEmprunt({ cjsUid: 'u1', exemplaireId: 'ex1' })).rejects.toMatchObject({
    code: 'DOUBLON_EMPRUNT',
  })
})

// ── Confirmation au scan badge (GUIC-343) ─────────────────────────────────────

test('confirmerEmprunt : initie → en_cours, exemplaire emprunte, date de retour +14j', async () => {
  mockEmpFindUnique.mockResolvedValueOnce({ id: 'e1', statut: 'initie', exemplaireId: 'ex1', exemplaire: { centreId: 'c1' } })
  mockEmpFindUniqueOrThrow.mockResolvedValueOnce(empruntRow({ statut: 'en_cours' }))
  const now = new Date('2026-06-25T10:00:00Z')

  await confirmerEmprunt({ empruntId: 'e1', staffCentreId: 'c1', now })

  const updateArg = mockEmpUpdate.mock.calls[0][0]
  expect(updateArg.data.statut).toBe('en_cours')
  const expected = new Date(now)
  expected.setDate(expected.getDate() + DUREE_EMPRUNT_JOURS)
  expect(updateArg.data.dateRetourPrevue.getTime()).toBe(expected.getTime())
  expect(mockExUpdate).toHaveBeenCalledWith({ where: { id: 'ex1' }, data: { statut: 'emprunte' } })
})

test('confirmerEmprunt : exemplaire d’un AUTRE centre → CENTRE_INTERDIT (RBAC)', async () => {
  mockEmpFindUnique.mockResolvedValueOnce({ id: 'e1', statut: 'initie', exemplaireId: 'ex1', exemplaire: { centreId: 'c2' } })
  await expect(confirmerEmprunt({ empruntId: 'e1', staffCentreId: 'c1' })).rejects.toMatchObject({
    code: 'CENTRE_INTERDIT',
  })
  expect(mockEmpUpdate).not.toHaveBeenCalled()
})

test('confirmerEmprunt : déjà confirmé → EMPRUNT_DEJA_CONFIRME', async () => {
  mockEmpFindUnique.mockResolvedValueOnce({ id: 'e1', statut: 'en_cours', exemplaireId: 'ex1', exemplaire: { centreId: 'c1' } })
  await expect(confirmerEmprunt({ empruntId: 'e1', staffCentreId: 'c1' })).rejects.toMatchObject({
    code: 'EMPRUNT_DEJA_CONFIRME',
  })
})

test('confirmerEmprunt : admin (staffCentreId=null) confirme un emprunt de N’IMPORTE quel centre', async () => {
  mockEmpFindUnique.mockResolvedValueOnce({ id: 'e1', statut: 'initie', exemplaireId: 'ex1', exemplaire: { centreId: 'autre-centre' } })
  mockEmpFindUniqueOrThrow.mockResolvedValueOnce(empruntRow({ statut: 'en_cours' }))

  // staffCentreId null = admin cross-centres → pas de CENTRE_INTERDIT.
  await expect(confirmerEmprunt({ empruntId: 'e1', staffCentreId: null })).resolves.toBeTruthy()
  expect(mockEmpUpdate.mock.calls[0][0].data.statut).toBe('en_cours')
})

// ── Retour (GUIC-343) ─────────────────────────────────────────────────────────

test('retournerEmprunt : en_cours → rendu, exemplaire redevient disponible', async () => {
  mockEmpFindUnique.mockResolvedValueOnce({ id: 'e1', statut: 'en_cours', exemplaireId: 'ex1', exemplaire: { centreId: 'c1' } })
  mockEmpFindUniqueOrThrow.mockResolvedValueOnce(empruntRow({ statut: 'rendu' }))

  await retournerEmprunt({ empruntId: 'e1', staffCentreId: 'c1' })

  expect(mockEmpUpdate.mock.calls[0][0].data.statut).toBe('rendu')
  expect(mockExUpdate).toHaveBeenCalledWith({ where: { id: 'ex1' }, data: { statut: 'disponible' } })
})

test('retournerEmprunt : déjà rendu → EMPRUNT_DEJA_RENDU', async () => {
  mockEmpFindUnique.mockResolvedValueOnce({ id: 'e1', statut: 'rendu', exemplaireId: 'ex1', exemplaire: { centreId: 'c1' } })
  await expect(retournerEmprunt({ empruntId: 'e1', staffCentreId: 'c1' })).rejects.toBeInstanceOf(BiblioDomainError)
})

// ── Mes emprunts (GUIC-343) ───────────────────────────────────────────────────

test('getEmpruntsActifs : ne renvoie que les statuts actifs avec les vues formatées', async () => {
  mockEmpFindMany.mockResolvedValueOnce([empruntRow({ statut: 'en_cours', dateRetourPrevue: new Date('2026-07-09T10:00:00Z') })])
  const r = await getEmpruntsActifs('u1')
  expect(r).toHaveLength(1)
  expect(r[0].livre.titre).toBe('Le Petit Prince')
  expect(r[0].dateRetourPrevue).toBe(new Date('2026-07-09T10:00:00Z').toISOString())
  // vérifie le filtre statut actif
  expect(mockEmpFindMany.mock.calls[0][0].where.statut.in).toEqual(['initie', 'en_cours', 'en_retard'])
})
