/**
 * @jest-environment node
 *
 * Tests des outils Yaye bibliothèque (Lot 3, GUIC-274/342/343) :
 * - search_library : recherche via l'endpoint EXISTANT, mapping emplacements.
 * - borrow_book : récap AVANT écriture (confirm=false), écriture déléguée (confirm=true),
 *   fallback web si non authentifié.
 * - get_active_loans : emprunts en cours + dates de retour.
 * La passerelle interne (callInternalRoute) et Prisma sont MOCKÉES.
 */

const mockCall = jest.fn()
const mockExFind = jest.fn()

jest.mock('@/lib/ia/internal-api', () => ({ callInternalRoute: (...a: unknown[]) => mockCall(...a) }))
jest.mock('@/lib/prisma', () => ({ prisma: { exemplaire: { findUnique: (...a: unknown[]) => mockExFind(...a) } } }))
jest.mock('@/lib/app-url', () => ({ appUrl: () => 'https://app.test' }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u1', roles: ['beneficiaire'] }

beforeEach(() => {
  jest.clearAllMocks()
})

// ── search_library ────────────────────────────────────────────────────────────

test('search_library : renvoie les livres + emplacements et passe q dans la requête', async () => {
  mockCall.mockResolvedValueOnce({
    ok: true,
    unauthenticated: false,
    json: {
      data: {
        livres: [
          {
            id: 'l1', titre: 'Algèbre', auteur: 'Dupont', theme: 'Maths',
            exemplairesDisponibles: 2,
            emplacements: [{ centreNom: 'Centre Dakar', rayon: 'M', etagere: '2', position: '5' }],
          },
        ],
      },
    },
  })

  const r = await TOOLS.search_library.execute({ q: 'algèbre' }, ctx)

  expect(r.ok).toBe(true)
  const path = mockCall.mock.calls[0][1].path as string
  expect(path).toContain('q=alg')
  const data = r.data as { livres: { titre: string; emplacements: unknown[] }[] }
  expect(data.livres[0].titre).toBe('Algèbre')
  expect(data.livres[0].emplacements).toHaveLength(1)
  expect(r.block?.kind).toBe('action')
})

test('search_library : aucun résultat → bloc texte explicite', async () => {
  mockCall.mockResolvedValueOnce({ ok: true, unauthenticated: false, json: { data: { livres: [] } } })
  const r = await TOOLS.search_library.execute({ q: 'zzz' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toEqual({ kind: 'text', text: 'Aucun livre trouvé pour cette recherche.' })
})

// ── borrow_book ───────────────────────────────────────────────────────────────

test('borrow_book : confirm=false → récap SANS écriture', async () => {
  mockExFind.mockResolvedValueOnce({
    statut: 'disponible', rayon: 'A', etagere: 'B', position: '3',
    livre: { titre: 'Le Petit Prince', auteur: 'Saint-Exupéry' },
    centre: { nom: 'Centre Test' },
  })

  const r = await TOOLS.borrow_book.execute({ exemplaireId: 'ex1', confirm: false }, ctx)

  expect(r.ok).toBe(true)
  expect((r.data as { needsConfirmation: boolean }).needsConfirmation).toBe(true)
  expect(mockCall).not.toHaveBeenCalled() // aucune écriture
})

test('borrow_book : confirm=false sur exemplaire indisponible → refus', async () => {
  mockExFind.mockResolvedValueOnce({
    statut: 'emprunte', rayon: 'A', etagere: 'B', position: '3',
    livre: { titre: 'X', auteur: 'Y' }, centre: { nom: 'C' },
  })
  const r = await TOOLS.borrow_book.execute({ exemplaireId: 'ex1', confirm: false }, ctx)
  expect(r.ok).toBe(false)
})

test('borrow_book : confirm=true → initie l’emprunt via l’endpoint existant', async () => {
  mockCall.mockResolvedValueOnce({
    ok: true,
    unauthenticated: false,
    json: { data: { emprunt: { id: 'e1', statut: 'initie', livre: { titre: 'Le Petit Prince' }, exemplaire: { centreNom: 'Centre Test' } } } },
  })

  const r = await TOOLS.borrow_book.execute({ exemplaireId: 'ex1', confirm: true }, ctx)

  expect(r.ok).toBe(true)
  expect((r.data as { empruntId: string }).empruntId).toBe('e1')
  expect(mockCall.mock.calls[0][1]).toMatchObject({ method: 'POST', path: '/api/bibliotheque/emprunts', body: { exemplaireId: 'ex1' } })
})

test('borrow_book : confirm=true non authentifié (WhatsApp) → fallback web', async () => {
  mockCall.mockResolvedValueOnce({ ok: false, unauthenticated: true, json: { error: { code: 'UNAUTHORIZED' } } })
  const r = await TOOLS.borrow_book.execute({ exemplaireId: 'ex1', confirm: true }, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { needsWeb: boolean }).needsWeb).toBe(true)
})

test('borrow_book : exemplaireId manquant → erreur', async () => {
  const r = await TOOLS.borrow_book.execute({ confirm: true }, ctx)
  expect(r.ok).toBe(false)
})

// ── get_active_loans ──────────────────────────────────────────────────────────

test('get_active_loans : liste les emprunts en cours', async () => {
  mockCall.mockResolvedValueOnce({
    ok: true,
    unauthenticated: false,
    json: {
      data: {
        emprunts: [
          { livre: { titre: 'Algèbre', auteur: 'D' }, statut: 'en_cours', exemplaire: { centreNom: 'C' }, dateRetourPrevue: '2026-07-09T10:00:00Z' },
        ],
      },
    },
  })

  const r = await TOOLS.get_active_loans.execute({}, ctx)

  expect(r.ok).toBe(true)
  expect((r.data as { emprunts: unknown[] }).emprunts).toHaveLength(1)
  expect(r.block?.kind).toBe('action')
})

test('get_active_loans : aucun emprunt → bloc texte', async () => {
  mockCall.mockResolvedValueOnce({ ok: true, unauthenticated: false, json: { data: { emprunts: [] } } })
  const r = await TOOLS.get_active_loans.execute({}, ctx)
  expect(r.block).toEqual({ kind: 'text', text: "Tu n'as aucun emprunt en cours." })
})
