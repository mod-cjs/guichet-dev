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
  mapStatutView,
  ageFromBirthdate,
  benefStatut,
  isoDay,
  startOfWeek,
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
    { id: 'r-b', date: '2026-07-03', time: '14:00', label: 'Salle A', sub: 'Awa Diop', atelier: false },
    { id: 'r-a', date: '2026-07-03', time: '09:00', label: 'Poste #3', sub: 'Fatou Ba', atelier: false },
  ]
  const events: AgendaItem[] = [
    { id: 'e-1', date: '2026-07-03', time: '11:30', label: 'Atelier CV', sub: '12 inscrits', atelier: true },
  ]

  it('fusionne réservations et événements triés par jour puis heure', () => {
    const items = buildAgendaItems(resa, events)
    expect(items.map((i) => i.id)).toEqual(['r-a', 'e-1', 'r-b'])
  })

  it('trie d’abord par jour', () => {
    const multi: AgendaItem[] = [
      { id: 'd2', date: '2026-07-04', time: '08:00', label: '', sub: '', atelier: false },
      { id: 'd1', date: '2026-07-03', time: '23:00', label: '', sub: '', atelier: false },
    ]
    expect(buildAgendaItems(multi, []).map((i) => i.id)).toEqual(['d1', 'd2'])
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

describe('isoDay (GUIC-497 — vues agenda)', () => {
  it('formate en YYYY-MM-DD local', () => {
    expect(isoDay(new Date(2026, 6, 3))).toBe('2026-07-03')
    expect(isoDay(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

describe('startOfWeek (GUIC-497 — semaine lundi→dimanche)', () => {
  it('renvoie le lundi de la semaine', () => {
    // 2026-07-03 est un vendredi → lundi = 2026-06-29
    expect(isoDay(startOfWeek(new Date(2026, 6, 3)))).toBe('2026-06-29')
  })

  it('un lundi reste inchangé', () => {
    expect(isoDay(startOfWeek(new Date(2026, 5, 29)))).toBe('2026-06-29')
  })

  it('un dimanche pointe sur le lundi précédent', () => {
    // 2026-07-05 est un dimanche → lundi = 2026-06-29
    expect(isoDay(startOfWeek(new Date(2026, 6, 5)))).toBe('2026-06-29')
  })
})

describe('mapStatutView (GUIC-495 — statuts réservation → vue design)', () => {
  it('mappe les trois statuts principaux', () => {
    expect(mapStatutView('EnAttente')).toMatchObject({ view: 'attente', tone: 'yellow' })
    expect(mapStatutView('Acceptee')).toMatchObject({ view: 'acceptee', tone: 'green' })
    expect(mapStatutView('Refusee')).toMatchObject({ view: 'refusee', tone: 'red' })
  })

  it('regroupe les annulations et non honorées', () => {
    expect(mapStatutView('AnnuleeParJeune').view).toBe('annulee')
    expect(mapStatutView('AnnuleeParCentre').view).toBe('annulee')
    expect(mapStatutView('NonHonoree').view).toBe('nonhonoree')
    expect(mapStatutView('Passee').view).toBe('passee')
  })

  it('fournit un libellé pour chaque statut', () => {
    expect(mapStatutView('EnAttente').label).toBeTruthy()
    expect(mapStatutView('inconnu').label).toBeTruthy()
  })
})

describe('ageFromBirthdate (GUIC-499 — annuaire bénéficiaires)', () => {
  const now = new Date('2026-07-03T12:00:00Z')

  it('calcule l’âge révolu', () => {
    expect(ageFromBirthdate(new Date('2004-01-01'), now)).toBe(22)
  })

  it('ne compte pas un anniversaire à venir dans l’année', () => {
    expect(ageFromBirthdate(new Date('2004-12-31'), now)).toBe(21)
  })

  it('retourne null si date inconnue', () => {
    expect(ageFromBirthdate(null, now)).toBeNull()
  })
})

describe('benefStatut (GUIC-499)', () => {
  it('« Actif » quand le profil est suffisamment complété', () => {
    expect(benefStatut(72).label).toBe('Actif')
    expect(benefStatut(50).label).toBe('Actif')
  })

  it('« Profil à compléter » sous le seuil', () => {
    expect(benefStatut(45).label).toBe('Profil à compléter')
    expect(benefStatut(0).label).toBe('Profil à compléter')
  })
})
