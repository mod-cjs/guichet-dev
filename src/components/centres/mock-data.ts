// Mock data — refonte Centres mobile (GUIC-193 / Phase 2B).
// MVP : pas de persistance, pas d'API rdv. Phase 4 remplacera par fetch Prisma + endpoints.

export interface MockCentre {
  id: string
  nom: string
  region: string
  adresse: string
  ville: string
  latitude: number
  longitude: number
  distanceKm: number
  isPrimary: boolean
  ouvert: boolean
  horaires: string
  conseillers: number
  services: string[]
}

export interface MockRdv {
  id: string
  centre: string
  conseillere: string
  date: Date
  jourLabel: string // "VEN"
  jourNum: number   // 24
  moisLabel: string // "MAI"
  heure: string     // "10h00"
  titre: string     // "RDV conseillère"
}

export type AtelierTone = 'yellow' | 'blue' | 'teal'

export interface MockAtelier {
  id: string
  titre: string
  jourNum: number
  moisLabel: string
  horaires: string // "14h–17h · 5 places restantes"
  tone: AtelierTone
  centreId: string
}

/* --- Centres ----------------------------------------------------------- */
export const MOCK_CENTRES: MockCentre[] = [
  {
    id: 'cjs-tamba',
    nom: 'CJS Tambacounda',
    region: 'Tambacounda',
    adresse: 'Avenue Léopold Sédar Senghor',
    ville: 'Quartier Médina · Tambacounda',
    latitude: 13.7706,
    longitude: -13.6673,
    distanceKm: 2.4,
    isPrimary: true,
    ouvert: true,
    horaires: 'Ouvert · ferme à 18h',
    conseillers: 3,
    services: ['Conseil 1-à-1', 'Ateliers CV', 'Wifi', 'Imprimante', 'Salle réunion'],
  },
  {
    id: 'cjs-kedougou',
    nom: 'CJS Kédougou',
    region: 'Kédougou',
    adresse: 'Quartier Lawol',
    ville: 'Kédougou',
    latitude: 12.5556,
    longitude: -12.1747,
    distanceKm: 189,
    isPrimary: false,
    ouvert: true,
    horaires: '8h–17h',
    conseillers: 2,
    services: ['Conseil', 'Wifi', 'Imprimante', 'Ateliers'],
  },
  {
    id: 'cjs-kolda',
    nom: 'CJS Kolda',
    region: 'Kolda',
    adresse: 'Bouna Kane',
    ville: 'Kolda',
    latitude: 12.8939,
    longitude: -14.9412,
    distanceKm: 262,
    isPrimary: false,
    ouvert: false,
    horaires: 'Ferme à 18h · ouvre 8h',
    conseillers: 2,
    services: ['Conseil', 'Wifi', 'Ateliers'],
  },
  {
    id: 'cjs-ziguinchor',
    nom: 'CJS Ziguinchor',
    region: 'Ziguinchor',
    adresse: 'Route de Boutoute',
    ville: 'Ziguinchor',
    latitude: 12.5681,
    longitude: -16.2719,
    distanceKm: 410,
    isPrimary: false,
    ouvert: true,
    horaires: '9h–18h',
    conseillers: 4,
    services: ['Conseil', 'Wifi', 'Imprimante', 'Ateliers', 'Salle réunion'],
  },
]

/* --- Prochain RDV ------------------------------------------------------ */
export const MOCK_RDV: MockRdv = {
  id: 'rdv-1',
  centre: 'CJS Tambacounda',
  conseillere: 'Mariama Ndiaye',
  date: new Date('2026-05-24T10:00:00+00:00'),
  jourLabel: 'VEN',
  jourNum: 24,
  moisLabel: 'MAI',
  heure: '10h00',
  titre: 'RDV conseillère',
}

/* --- Ateliers à venir au centre primary -------------------------------- */
export const MOCK_ATELIERS: MockAtelier[] = [
  {
    id: 'at-1',
    titre: 'Atelier CV & lettre de motivation',
    jourNum: 25,
    moisLabel: 'MAI',
    horaires: '14h–17h · 5 places restantes',
    tone: 'yellow',
    centreId: 'cjs-tamba',
  },
  {
    id: 'at-2',
    titre: 'Pitch ton projet · coaching',
    jourNum: 28,
    moisLabel: 'MAI',
    horaires: '10h–12h · 8 places',
    tone: 'blue',
    centreId: 'cjs-tamba',
  },
  {
    id: 'at-3',
    titre: 'Initiation Excel & Google Workspace',
    jourNum: 2,
    moisLabel: 'JUIN',
    horaires: '9h–13h · gratuit',
    tone: 'teal',
    centreId: 'cjs-tamba',
  },
  {
    id: 'at-4',
    titre: 'Atelier création d\'entreprise',
    jourNum: 6,
    moisLabel: 'JUIN',
    horaires: '14h–17h · 10 places',
    tone: 'yellow',
    centreId: 'cjs-tamba',
  },
]
