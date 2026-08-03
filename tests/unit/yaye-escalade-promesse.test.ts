/**
 * @jest-environment node
 *
 * Ce que Yaye PROMET quand elle escalade (vague 1.2, option A2).
 *
 * Constat de l'audit : Yaye annonçait « un conseiller va te répondre ici même », alors
 * qu'aucune route ne permet à un conseiller de répondre dans le fil — la seule surface
 * est une file avec deux boutons, « prendre en charge » et « marquer résolue ». La
 * promesse était fausse, et elle l'était sur le chemin des signalements de danger.
 *
 * Tant que le canal de réponse n'existe pas, Yaye dit ce qui est vrai : l'équipe est
 * alertée et recontactera la personne. Et sur un signal de danger, elle donne en plus
 * un recours immédiat, indépendant du CJS.
 */
import { DANGER_RESSOURCES, escaladeMessage } from '@/lib/ia/escalade-message'

describe('Plus aucune promesse de réponse dans le fil', () => {
  const cas = [
    escaladeMessage({ danger: false, dejaEnCours: false }),
    escaladeMessage({ danger: false, dejaEnCours: true }),
    escaladeMessage({ danger: true, dejaEnCours: false }),
    escaladeMessage({ danger: true, dejaEnCours: true }),
  ]
  for (const message of cas) {
    it(`« ${message.slice(0, 45)}… » ne promet pas une réponse ici`, () => {
      expect(message).not.toMatch(/ici\s*même/i)
      expect(message).not.toMatch(/répondra?\s+(ici|dans ce fil)/i)
    })
  }
})

describe('Ce qui est promis est vrai et vérifiable', () => {
  it('annonce que l’équipe est alertée et recontactera', () => {
    const m = escaladeMessage({ danger: false, dejaEnCours: false })
    expect(m).toMatch(/alert|transmis|prévenue/i)
    expect(m).toMatch(/recontact|revenir vers toi|te joindre/i)
  })
  it('ne promet aucun délai', () => {
    for (const danger of [true, false]) {
      const m = escaladeMessage({ danger, dejaEnCours: false })
      expect(m).not.toMatch(/\b(24|48)\s*h|aujourd|demain|sous\s+\d/i)
    }
  })
  it('distingue une escalade déjà en cours', () => {
    const encours = escaladeMessage({ danger: false, dejaEnCours: true })
    expect(encours).toMatch(/déjà/i)
  })
})

describe('Danger : un recours immédiat, qui ne dépend pas du CJS', () => {
  it('le message de danger oriente vers une aide joignable tout de suite', () => {
    const m = escaladeMessage({ danger: true, dejaEnCours: false })
    expect(m).toMatch(/urgence|immédiat|tout de suite/i)
  })
  it('les ressources d’urgence sont des numéros publics, jamais un contact de tiers', () => {
    expect(DANGER_RESSOURCES.length).toBeGreaterThan(0)
    for (const r of DANGER_RESSOURCES) {
      expect(r.libelle.length).toBeGreaterThan(3)
      expect(r.numero).toMatch(/^[0-9+\s]+$/) // numéro public, pas une donnée personnelle
    }
  })
  it('une escalade ordinaire n’affiche pas les ressources d’urgence', () => {
    expect(escaladeMessage({ danger: false, dejaEnCours: false })).not.toMatch(/urgence/i)
  })
})
