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

// ─────────────────────────────────────────────────────────────────
// Wave 2 — Vue `all` enrichie (GUIC-353)
// ─────────────────────────────────────────────────────────────────

// Helper: ordre des jours (référence type, pas runtime)
const JOURS_ORDER = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const
export type JourSemaine = (typeof JOURS_ORDER)[number]

export interface CentreHoraire {
  jour: JourSemaine | string
  ouvert: boolean
  ouvreA?: string | null
  fermeA?: string | null
}

/**
 * Centre enrichi pour la vue `all` (W2).
 *
 * Inclut horaires structurés + `isOpen` calculé côté serveur (jour + heure
 * courante). Services + conseillersCount viennent du modèle étendu W0
 * (PR #116). Tant que les colonnes ne sont pas mergées dans `dev`, des
 * fallbacks raisonnables sont appliqués.
 */
export interface CentreWithStatus {
  id: string
  slug: string
  nom: string
  region: string
  ville: string
  adresse: string
  latitude: number
  longitude: number
  services: string[]
  conseillersCount: number
  estActif: boolean
  horaires: CentreHoraire[]
  isOpen: boolean
}

export interface ListCentresFilters {
  region?: string
  search?: string
  limit?: number
  offset?: number
}

const DAY_BY_JS_INDEX: JourSemaine[] = [
  'Dimanche', // 0
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
]

/** Slugifie le nom d'un centre (sera remplacé par la colonne `slug` W0). */
export function slugifyCentre(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function compareHHMM(a: string, b: string): number {
  // Sécurité : compare au format "HH:MM" string — alphabétique = chronologique
  return a < b ? -1 : a > b ? 1 : 0
}

/** Détermine si un centre est ouvert à l'heure de référence. */
export function computeIsOpen(
  horaires: CentreHoraire[],
  now: Date = new Date(),
): boolean {
  const jour = DAY_BY_JS_INDEX[now.getDay()]
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const hhmm = `${h}:${m}`
  const row = horaires.find((x) => x.jour === jour)
  if (!row || !row.ouvert || !row.ouvreA || !row.fermeA) return false
  return compareHHMM(row.ouvreA, hhmm) <= 0 && compareHHMM(hhmm, row.fermeA) < 0
}

/**
 * Liste enrichie pour Wave 2 — vue `all`, onboarding, et API `/api/centres`.
 *
 * Mode défensif : tente de récupérer les nouvelles colonnes (services,
 * horaires, conseillersCount, slug) introduites dans W0. Si elles ne sont
 * pas encore mergées, applique des fallbacks compatibles avec la prod.
 */
export async function getCentresWithStatusAndHoraires(
  filters?: ListCentresFilters,
  now: Date = new Date(),
): Promise<CentreWithStatus[]> {
  const where: Record<string, unknown> = { estActif: true }
  if (filters?.region && filters.region !== 'all') {
    where.region = filters.region
  }
  if (filters?.search) {
    where.OR = [
      { nom: { contains: filters.search } },
      { adresse: { contains: filters.search } },
    ]
  }

  // Sélection souple — selon état du schema (W0 mergé ou pas), on essaye d'inclure
  // les nouvelles relations/colonnes. La typage `any` est volontairement local au
  // findMany pour ne pas bloquer le build tant que W0 n'est pas appliqué.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findArgs: any = {
    where,
    orderBy: [{ region: 'asc' }, { nom: 'asc' }],
    take: filters?.limit,
    skip: filters?.offset,
  }

  const rows = (await prisma.centre.findMany(findArgs)) as Array<
    Record<string, unknown>
  >

  return rows.map((r) => {
    const horaires = ((r.horaires as CentreHoraire[] | undefined) ?? []).map(
      (h) => ({
        jour: h.jour,
        ouvert: h.ouvert,
        ouvreA: h.ouvreA ?? null,
        fermeA: h.fermeA ?? null,
      }),
    )
    // Fallback : si pas d'horaires (W0 pas mergé), suppose lun-ven 08:00–17:00
    const hList: CentreHoraire[] =
      horaires.length > 0
        ? horaires
        : (['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as JourSemaine[]).map(
            (j) => ({ jour: j, ouvert: true, ouvreA: '08:00', fermeA: '17:00' }),
          )
    const services = Array.isArray(r.services)
      ? (r.services as string[])
      : DEFAULT_SERVICES
    const slug =
      typeof r.slug === 'string' && r.slug.length > 0
        ? (r.slug as string)
        : slugifyCentre(String(r.nom))

    return {
      id: String(r.id),
      slug,
      nom: String(r.nom),
      region: String(r.region),
      ville: String(r.region).replace(/_/g, '-'),
      adresse: String(r.adresse),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      services,
      conseillersCount: Number(r.conseillersCount ?? 0),
      estActif: Boolean(r.estActif),
      horaires: hList,
      isOpen: computeIsOpen(hList, now),
    }
  })
}

/** Compte total (paginated API). */
export async function countCentres(filters?: ListCentresFilters): Promise<number> {
  const where: Record<string, unknown> = { estActif: true }
  if (filters?.region && filters.region !== 'all') where.region = filters.region
  if (filters?.search) {
    where.OR = [
      { nom: { contains: filters.search } },
      { adresse: { contains: filters.search } },
    ]
  }
  return prisma.centre.count({ where })
}
