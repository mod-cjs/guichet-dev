/**
 * @jest-environment node
 *
 * Tests de l'ordre des niveaux d'étude pour l'éligibilité (GUIC-433).
 * Module pur — aucun mock.
 */
import { niveauRank, allowedNiveaux, NIVEAU_ORDER } from '@/lib/ia/graph/niveau'

test('NIVEAU_ORDER : ordre croissant complet', () => {
  expect(NIVEAU_ORDER).toEqual(['BFEM', 'BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5', 'DOCTORAT'])
})

test('niveauRank : rang correct, -1 si inconnu/null', () => {
  expect(niveauRank('BFEM')).toBe(0)
  expect(niveauRank('BAC_PLUS_5')).toBe(4)
  expect(niveauRank(null)).toBe(-1)
  expect(niveauRank('INCONNU')).toBe(-1)
})

test('allowedNiveaux : tous les niveaux ≤ celui du bénéficiaire', () => {
  expect(allowedNiveaux('BAC')).toEqual(['BFEM', 'BAC'])
  expect(allowedNiveaux('DOCTORAT')).toEqual(NIVEAU_ORDER)
})

test('allowedNiveaux : niveau inconnu → vide (on retombe sur niveauEtudeMin IS NULL)', () => {
  expect(allowedNiveaux(null)).toEqual([])
  expect(allowedNiveaux(undefined)).toEqual([])
})
