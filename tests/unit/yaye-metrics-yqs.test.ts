/**
 * @jest-environment node
 *
 * Tests du Yaye Quality Score (GUIC-435, jalon F).
 * Vérifie : moyenne pondérée, garde-fous non compensables, renormalisation, cas null.
 */

jest.mock('@/lib/prisma', () => ({ prisma: {} }))

import { computeYqs, applyGlobalGuard } from '@/lib/ia/metrics/yqs'

const couchesPleines = {
  operationnel: 0.9,
  efficacite: 0.9,
  qualite: 0.9,
  resultat: 0.9,
  satisfaction: 0.9,
}

test('moyenne pondérée sans garde-fou → ~90, pas de drapeau', () => {
  const r = computeYqs(couchesPleines, { fidelite: 0.9, conformiteCdp: 0.9 })
  expect(r.yqs).toBeCloseTo(90, 1)
  expect(r.drapeauRouge).toBe(false)
  expect(r.plafonne).toBe(false)
})

test('garde-fou fidélité sous seuil → drapeau rouge + YQS plafonné à 50', () => {
  const r = computeYqs(couchesPleines, { fidelite: 0.3, conformiteCdp: 0.9 })
  expect(r.drapeauRouge).toBe(true)
  expect(r.plafonne).toBe(true)
  expect(r.yqs).toBe(50)
})

test('garde-fou conformité CDP sous seuil → drapeau rouge', () => {
  const r = computeYqs(couchesPleines, { fidelite: 0.9, conformiteCdp: 0.2 })
  expect(r.drapeauRouge).toBe(true)
  expect(r.yqs).toBe(50)
})

test('couches nulles exclues et poids renormalisés', () => {
  const r = computeYqs(
    { operationnel: null, efficacite: null, qualite: 0.8, resultat: null, satisfaction: null },
    { fidelite: 0.8, conformiteCdp: 0.8 },
  )
  expect(r.yqs).toBeCloseTo(80, 1) // seule la qualité compte → 0.8*100
})

test('toutes les couches nulles → YQS null', () => {
  const r = computeYqs(
    { operationnel: null, efficacite: null, qualite: null, resultat: null, satisfaction: null },
    { fidelite: null, conformiteCdp: null },
  )
  expect(r.yqs).toBeNull()
  expect(r.drapeauRouge).toBe(false)
})

test('garde GLOBALE sur le taux de drapeau rouge (pas la moyenne)', () => {
  // Sous le seuil (5 % < 10 %) → pas de garde, YQS intact.
  expect(applyGlobalGuard(85, 0.05)).toEqual({ yqs: 85, drapeauRouge: false, plafonne: false })
  // Au-dessus du seuil → drapeau + plafond à 50 (une hallucination de masse n'est plus noyée).
  expect(applyGlobalGuard(85, 0.2)).toEqual({ yqs: 50, drapeauRouge: true, plafonne: true })
  // Drapeau mais YQS déjà bas → pas de plafonnement supplémentaire.
  expect(applyGlobalGuard(40, 0.2)).toEqual({ yqs: 40, drapeauRouge: true, plafonne: false })
})
