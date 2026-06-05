/**
 * Données mock pour le tableau de bord bénéficiaire — Phase 2B/1 (GUIC-187).
 *
 * Les API stats / reco ne sont pas encore branchées. Ces objets sont importés
 * directement par la page server-side et remplacés progressivement par des
 * loaders Prisma dans les phases suivantes.
 */

import type { KPIItem } from './DashboardKPIs'
import type { MiniOpp } from './MiniOppCard'

/** 4 KPIs affichés en haut du dashboard. */
export const MOCK_KPIS: KPIItem[] = [
  {
    label: 'Candidatures',
    value: 3,
    delta: '+1 cette semaine',
    icon:  'document',
    tone:  'teal',
  },
  {
    label: 'Entretiens',
    value: 2,
    delta: 'Prochain dans 4 j',
    icon:  'calendar',
    tone:  'yellow',
  },
  {
    label: 'Favoris',
    value: 12,
    delta: '2 expirent bientôt',
    icon:  'bookmark',
    tone:  'blue',
  },
  {
    label: 'Opportunités vues',
    value: 47,
    delta: 'Cette semaine',
    icon:  'eye',
    tone:  'red',
  },
]

/** Sélection d'opportunités recommandées (carousel). */
export const MOCK_RECO_OPPS: MiniOpp[] = [
  {
    id:    'mock-opp-1',
    titre: 'Bourse agricole — Micro-initiative maraîchère',
    org:   'jusqu\'à 600 000 FCFA · Tambacounda',
    tag:   'J-3 · URGENT',
    tone:  'red',
    match: '92% match',
    href:  '/opportunites/mock-opp-1',
  },
  {
    id:    'mock-opp-2',
    titre: 'Stage Data Science · 6 mois',
    org:   'Sonatel · Dakar Plateau',
    tag:   'STAGE · J-9',
    tone:  'teal',
    match: '87% match',
    href:  '/opportunites/mock-opp-2',
  },
  {
    id:    'mock-opp-3',
    titre: 'Marketing digital · alternance 12 mois',
    org:   'Senegal Airlines · Diass',
    tag:   'ALTERNANCE · J-12',
    tone:  'yellow',
    match: '76% match',
    href:  '/opportunites/mock-opp-3',
  },
  {
    id:    'mock-opp-4',
    titre: 'Concours Jeunes Entrepreneurs 2026',
    org:   'National · 2.5M FCFA + coaching',
    tag:   'CONCOURS · J-21',
    tone:  'yellow',
    href:  '/opportunites/mock-opp-4',
  },
]

/** Événements mock — sera remplacé par EventCard quand le module sera mergé. */
export interface MockEvent {
  id:    string
  jour:  number
  mois:  string
  titre: string
  sous:  string
}

export const MOCK_EVENTS: MockEvent[] = [
  { id: 'e1', jour: 22, mois: 'Mai',  titre: 'Atelier CV — CJS Tamba',     sous: '14h–17h · 5 places restantes' },
  { id: 'e2', jour: 28, mois: 'Mai',  titre: 'Forum emploi Diamniadio',    sous: '9h–18h · 40 recruteurs' },
  { id: 'e3', jour: 2,  mois: 'Juin', titre: 'Démarrage Bootcamp Data',    sous: 'CJS Dakar · 8 semaines' },
]

/** Centres mock — sera remplacé par CentreListItem quand le module sera mergé. */
export interface MockCentre {
  id:        string
  nom:       string
  adresse:   string
  distance:  string
}

export const MOCK_CENTRES: MockCentre[] = [
  { id: 'c1', nom: 'CJS Tambacounda', adresse: 'Av. Léopold Sédar Senghor · wifi gratuit', distance: '2.4 km' },
  { id: 'c2', nom: 'CJS Kédougou',    adresse: 'Quartier Lawol · réservation salle',       distance: '189 km' },
  { id: 'c3', nom: 'CJS Kaolack',     adresse: 'Médina Baye · scan badge',                 distance: '220 km' },
]
