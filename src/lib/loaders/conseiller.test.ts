/**
 * @jest-environment node
 */
// GUIC-493 / GUIC-501 — Socle Espace conseiller : helpers purs du contexte
// (initiales + choix du centre actif parmi les rattachements AgentCentre).
import {
  buildInitials,
  pickActiveCentre,
  mapRessourceKind,
  buildAgendaItems,
  type ConseillerCentre,
  type AgendaItem,
} from './conseiller'

describe('buildInitials (GUIC-493)', () => {
  it('compose les initiales prénom + nom', () => {
    expect(buildInitials('Cheikh', 'Ndiaye')).toBe('CN')
  })

  it('retombe sur les premières lettres disponibles si un champ manque', () => {
    expect(buildInitials('Awa', null)).toBe('A')
    expect(buildInitials('', 'Diop')).toBe('D')
    expect(buildInitials(null, undefined)).toBe('')
  })

  it('met en majuscules', () => {
    expect(buildInitials('modou', 'sarr')).toBe('MS')
  })
})

describe('pickActiveCentre (GUIC-493 — multi-centre)', () => {
  const centres: ConseillerCentre[] = [
    { id: 'c1', nom: 'CJS Tambacounda' },
    { id: 'c2', nom: 'CJS Bakel' },
  ]

  it('retourne null si aucun rattachement', () => {
    expect(pickActiveCentre([], 'c1')).toBeNull()
  })

  it('privilégie le centre préféré quand il existe', () => {
    expect(pickActiveCentre(centres, 'c2')?.id).toBe('c2')
  })

  it('retombe sur le premier centre si le préféré est inconnu ou absent', () => {
    expect(pickActiveCentre(centres, 'zzz')?.id).toBe('c1')
    expect(pickActiveCentre(centres, null)?.id).toBe('c1')
    expect(pickActiveCentre(centres)?.id).toBe('c1')
  })
})

describe('mapRessourceKind (GUIC-495 — cohérence Lot 7 salle/véhicule/poste)', () => {
  it('mappe les types du modèle vers les tons du design v4', () => {
    expect(mapRessourceKind('Salle').kind).toBe('salle')
    expect(mapRessourceKind('Vehicule').kind).toBe('vehicule')
    expect(mapRessourceKind('Poste_info').kind).toBe('poste')
    expect(mapRessourceKind('Atelier_recurrent').kind).toBe('atelier')
  })

  it('retombe sur « equipement » pour un type inconnu ou Equipement', () => {
    expect(mapRessourceKind('Equipement').kind).toBe('equipement')
    expect(mapRessourceKind('n_importe_quoi').kind).toBe('equipement')
  })

  it('fournit une icône et un libellé pour chaque type', () => {
    const k = mapRessourceKind('Salle')
    expect(k.icon).toBeTruthy()
    expect(k.label).toBeTruthy()
  })
})

describe('buildAgendaItems (GUIC-497 — agenda dérivé Réservation + Événement)', () => {
  const resa: AgendaItem[] = [
    { id: 'r-b', time: '14:00', label: 'Salle A', sub: 'Awa Diop', atelier: false },
    { id: 'r-a', time: '09:00', label: 'Poste #3', sub: 'Fatou Ba', atelier: false },
  ]
  const events: AgendaItem[] = [
    { id: 'e-1', time: '11:30', label: 'Atelier CV', sub: '12 inscrits', atelier: true },
  ]

  it('fusionne réservations et événements triés par heure croissante', () => {
    const items = buildAgendaItems(resa, events)
    expect(items.map((i) => i.id)).toEqual(['r-a', 'e-1', 'r-b'])
  })

  it('distingue les ateliers collectifs des RDV individuels', () => {
    const items = buildAgendaItems(resa, events)
    expect(items.find((i) => i.id === 'e-1')?.atelier).toBe(true)
    expect(items.find((i) => i.id === 'r-a')?.atelier).toBe(false)
  })

  it('retourne un tableau vide quand aucune source', () => {
    expect(buildAgendaItems([], [])).toEqual([])
  })
})
