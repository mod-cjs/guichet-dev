import { prisma } from '@/lib/prisma'

/**
 * DTO d'un centre pour la page publique `/centres`.
 *
 * Calé sur la forme attendue par les composants `CentreListItem` / `CentresMap`
 * (initialement nourris par `MOCK_CENTRES`). Certains champs UI ne sont pas
 * (encore) en base : ils prennent des valeurs par défaut raisonnables.
 *
 * TODO(GUIC-235) — quand le modèle Centre s'enrichira (services, conseillers,
 * horaires structurés, statut ouvert/fermé temps réel, géolocalisation user
 * pour `distanceKm`), retirer les défauts ci-dessous.
 */
export interface CentreListItem {
  id: string
  nom: string
  region: string
  adresse: string
  /** Ville d'affichage (dérivée de la région tant que pas en DB). */
  ville: string
  latitude: number
  longitude: number
  /** Distance utilisateur — 0 tant qu'on n'a pas la géoloc du visiteur. */
  distanceKm: number
  /** Centre "principal" pour l'utilisateur. Premier de la liste par défaut. */
  isPrimary: boolean
  /** Ouvert/fermé — TODO horaires structurés en DB. */
  ouvert: boolean
  horaires: string
  /** Nombre de conseillers — TODO compter via AgentCentre. */
  conseillers: number
  services: string[]
}

const DEFAULT_HORAIRES = '8h–17h'
const DEFAULT_SERVICES: string[] = ['Conseil 1-à-1', 'Ateliers', 'Wifi']

/**
 * Liste les centres CJS actifs pour la page publique `/centres`.
 *
 * Tri : région puis nom (ordre stable, agréable côté UI).
 * Le premier centre devient `isPrimary` par défaut (le composant `CentresMap`
 * l'utilise comme point mis en évidence).
 */
export async function listCentres(): Promise<CentreListItem[]> {
  const rows = await prisma.centre.findMany({
    where: { estActif: true },
    orderBy: [{ region: 'asc' }, { nom: 'asc' }],
    select: {
      id: true,
      nom: true,
      region: true,
      adresse: true,
      latitude: true,
      longitude: true,
    },
  })

  return rows.map((c, idx) => ({
    id: c.id,
    nom: c.nom,
    region: String(c.region),
    adresse: c.adresse,
    ville: String(c.region).replace(/_/g, '-'),
    latitude: c.latitude,
    longitude: c.longitude,
    distanceKm: 0,
    isPrimary: idx === 0,
    ouvert: true,
    horaires: DEFAULT_HORAIRES,
    conseillers: 0,
    services: DEFAULT_SERVICES,
  }))
}
