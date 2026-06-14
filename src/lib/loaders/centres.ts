import type { Prisma } from '@prisma/client'
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
  const where: Prisma.CentreWhereInput = { estActif: true }
  if (filters?.region && filters.region !== 'all') {
    where.region = filters.region as Prisma.CentreWhereInput['region']
  }
  if (filters?.search) {
    where.OR = [
      { nom: { contains: filters.search } },
      { adresse: { contains: filters.search } },
    ]
  }

  const rows = await prisma.centre.findMany({
    where,
    orderBy: [{ region: 'asc' }, { nom: 'asc' }],
    take: filters?.limit,
    skip: filters?.offset,
    include: { horaires: true },
  })

  return rows.map((r) => {
    const horaires = r.horaires.map((h) => ({
      jour: h.jour,
      ouvert: h.ouvert,
      ouvreA: h.ouvreA ?? null,
      fermeA: h.fermeA ?? null,
    }))
    // Fallback : si pas d'horaires en base, suppose lun-ven 08:00–17:00
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
        ? r.slug
        : slugifyCentre(r.nom)

    return {
      id: r.id,
      slug,
      nom: r.nom,
      region: String(r.region),
      ville: String(r.region).replace(/_/g, '-'),
      adresse: r.adresse,
      latitude: r.latitude,
      longitude: r.longitude,
      services,
      conseillersCount: r.conseillersCount,
      estActif: r.estActif,
      horaires: hList,
      isOpen: computeIsOpen(hList, now),
    }
  })
}

// ─────────────────────────────────────────────────────────────────
// Wave 3 — Vue `detail` (GUIC-357)
// ─────────────────────────────────────────────────────────────────

const ALL_JOURS: JourSemaine[] = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

export interface CentreDetailRessource {
  id: string
  type: string
  nom: string
  capacite: number
  capaciteUnit: string | null
  estActive: boolean
}

/**
 * Centre + horaires + ressources teaser (4 max) pour la page détail.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export interface CentreDetail {
  id: string
  slug: string
  nom: string
  region: string
  ville: string | null
  adresse: string
  telephone: string
  email: string | null
  description: string | null
  imageUrl: string | null
  latitude: number
  longitude: number
  services: string[]
  conseillersCount: number
  isOpen: boolean
  openingHoursText: string | null
  horaires: Array<{
    jour: string
    ouvert: boolean
    ouvreA: string | null
    fermeA: string | null
  }>
  ressources: CentreDetailRessource[]
}

/**
 * Texte d'ouverture du jour : "08:00 - 18:00" si ouvert, sinon
 * "Ouvre à HH:MM" pour le prochain jour ouvert, sinon `null`.
 */
function computeOpeningHoursText(
  horaires: CentreHoraire[],
  now: Date,
): string | null {
  const todayIdx = now.getDay() // 0=dimanche
  const todayJour = DAY_BY_JS_INDEX[todayIdx]
  const today = horaires.find((h) => h.jour === todayJour)
  if (today && today.ouvert && today.ouvreA && today.fermeA) {
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    const hhmm = `${h}:${m}`
    if (compareHHMM(hhmm, today.ouvreA) < 0) {
      return `Ouvre à ${today.ouvreA}`
    }
    if (compareHHMM(hhmm, today.fermeA) < 0) {
      return `${today.ouvreA} - ${today.fermeA}`
    }
  }
  // Cherche prochain jour ouvert
  for (let i = 1; i <= 7; i++) {
    const j = DAY_BY_JS_INDEX[(todayIdx + i) % 7]
    const row = horaires.find((h) => h.jour === j)
    if (row && row.ouvert && row.ouvreA) {
      return `Ouvre ${j.toLowerCase()} à ${row.ouvreA}`
    }
  }
  return null
}

/**
 * Charge un centre par son `slug`, incluant horaires (triés Lun→Dim) +
 * 4 ressources actives (teaser).
 *
 * Retourne `null` si introuvable ou désactivé.
 */
export async function getCentreBySlug(
  slug: string,
  now: Date = new Date(),
): Promise<CentreDetail | null> {
  const row = await prisma.centre.findFirst({
    where: { slug, estActif: true },
    include: {
      horaires: true,
      ressources: {
        where: { estActive: true },
        take: 4,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!row) return null

  const rawHoraires = row.horaires
  // Normalise + remplit les jours manquants
  const horairesByJour = new Map<string, CentreHoraire>()
  for (const h of rawHoraires) horairesByJour.set(String(h.jour), h)
  const horaires = ALL_JOURS.map((j) => {
    const found = horairesByJour.get(j)
    return {
      jour: j,
      ouvert: found?.ouvert ?? false,
      ouvreA: found?.ouvreA ?? null,
      fermeA: found?.fermeA ?? null,
    }
  })

  // Fallback : si 0 horaire en base, on simule Lun-Ven
  const hasAnyHoraire = rawHoraires.length > 0
  const effectiveHoraires: CentreHoraire[] = hasAnyHoraire
    ? horaires
    : ALL_JOURS.map((j) =>
        j === 'Samedi' || j === 'Dimanche'
          ? { jour: j, ouvert: false, ouvreA: null, fermeA: null }
          : { jour: j, ouvert: true, ouvreA: '08:00', fermeA: '17:00' },
      )

  const services = Array.isArray(row.services)
    ? (row.services as string[])
    : []

  const ressources = row.ressources.map((r) => ({
    id: r.id,
    type: String(r.type),
    nom: r.nom,
    capacite: r.capacite,
    capaciteUnit: r.capaciteUnit ?? null,
    estActive: r.estActive,
  }))

  const slugFinal =
    typeof row.slug === 'string' && row.slug.length > 0
      ? row.slug
      : slugifyCentre(row.nom)

  return {
    id: row.id,
    slug: slugFinal,
    nom: row.nom,
    region: String(row.region),
    ville:
      typeof row.ville === 'string' && row.ville.length > 0
        ? row.ville
        : String(row.region).replace(/_/g, '-'),
    adresse: row.adresse,
    telephone: row.telephone,
    email: row.email ?? null,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    services,
    conseillersCount: row.conseillersCount,
    isOpen: computeIsOpen(effectiveHoraires, now),
    openingHoursText: computeOpeningHoursText(effectiveHoraires, now),
    horaires: effectiveHoraires.map((h) => ({
      jour: String(h.jour),
      ouvert: h.ouvert,
      ouvreA: h.ouvreA ?? null,
      fermeA: h.fermeA ?? null,
    })),
    ressources,
  }
}

// ─────────────────────────────────────────────────────────────────
// Wave 4 — Ressources réservables (GUIC-358 / GUIC-359)
// ─────────────────────────────────────────────────────────────────

export interface RessourceDetail {
  id: string
  centreId: string
  type: string
  nom: string
  description: string | null
  imageUrl: string | null
  capacite: number
  capaciteUnit: string | null
  dureeMinCreneauMin: number
  requiresJustif: boolean
  estActive: boolean
}

/**
 * Liste les ressources d'un centre (toutes — actives et inactives) triées
 * par type puis nom. Pour le filtrage UI, on inclut aussi les inactives
 * mais le client les masque par défaut.
 *
 * Wave 4. Spec : M4-centres-lot7.md §5 Wave 4.
 */
export async function getRessourcesByCentre(
  centreId: string,
): Promise<RessourceDetail[]> {
  const rows = await prisma.ressourceCentre.findMany({
    where: { centreId, estActive: true },
    orderBy: [{ type: 'asc' }, { nom: 'asc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    centreId: r.centreId,
    type: String(r.type),
    nom: r.nom,
    description: r.description ?? null,
    imageUrl: r.imageUrl ?? null,
    capacite: r.capacite,
    capaciteUnit: r.capaciteUnit ?? null,
    dureeMinCreneauMin: r.dureeMinCreneauMin,
    requiresJustif: r.requiresJustif,
    estActive: r.estActive,
  }))
}

/**
 * Charge une ressource par son `id`. Retourne `null` si introuvable.
 * Wave 4.
 */
export async function getRessourceById(
  id: string,
): Promise<RessourceDetail | null> {
  const r = await prisma.ressourceCentre.findUnique({ where: { id } })
  if (!r) return null
  return {
    id: r.id,
    centreId: r.centreId,
    type: String(r.type),
    nom: r.nom,
    description: r.description ?? null,
    imageUrl: r.imageUrl ?? null,
    capacite: r.capacite,
    capaciteUnit: r.capaciteUnit ?? null,
    dureeMinCreneauMin: r.dureeMinCreneauMin,
    requiresJustif: r.requiresJustif,
    estActive: r.estActive,
  }
}

// ─────────────────────────────────────────────────────────────────
// Wave 5 — Mes réservations centres (GUIC-384)
// ─────────────────────────────────────────────────────────────────

export interface MesReservationCentre {
  id: string
  ressource: {
    id: string
    nom: string
    type: string
  }
  centre: {
    id: string
    slug: string
    nom: string
    region: string
  }
  /** ISO string (jour calendaire). */
  dateReservee: string
  creneauDebut: string
  creneauFin: string
  nombrePersonnes: number
  motif: string
  statut: string
  decisionA: string | null
  fichierJustifUrl: string | null
}

/**
 * Liste les réservations centres d'un utilisateur (tous statuts confondus),
 * triées par `dateReservee` desc.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5.
 */
export async function getMesReservationsCentres(
  cjsUid: string,
): Promise<MesReservationCentre[]> {
  const rows = await prisma.reservation.findMany({
    where: { cjsUid },
    orderBy: [{ dateReservee: 'desc' }, { createdAt: 'desc' }],
    include: {
      ressource: { select: { id: true, nom: true, type: true } },
      centre: { select: { id: true, slug: true, nom: true, region: true } },
    },
  })

  return rows.map((r) => {
    return {
      id: r.id,
      ressource: {
        id: r.ressource.id,
        nom: r.ressource.nom,
        type: String(r.ressource.type),
      },
      centre: {
        id: r.centre.id,
        slug:
          r.centre.slug && r.centre.slug.length > 0
            ? r.centre.slug
            : slugifyCentre(r.centre.nom),
        nom: r.centre.nom,
        region: String(r.centre.region),
      },
      dateReservee: r.dateReservee.toISOString(),
      creneauDebut: r.creneauDebut,
      creneauFin: r.creneauFin,
      nombrePersonnes: r.nombrePersonnes,
      motif: r.motif,
      statut: String(r.statut),
      decisionA: r.decisionA ? r.decisionA.toISOString() : null,
      fichierJustifUrl: r.justifFileUrl ?? null,
    }
  })
}

// ─────────────────────────────────────────────────────────────────
// Wave 6.1 — Ma carte CJS : usages récents (GUIC-386)
// ─────────────────────────────────────────────────────────────────

export interface UsageCarteCJS {
  type: 'reservation' | 'checkin'
  id: string
  centreNom: string
  centreSlug: string
  ressourceNom: string | null
  /** ISO string. */
  date: string
  statut: string
}

/**
 * Liste les 10 derniers usages "réussis" d'un jeune (réservations validées +
 * check-ins) pour alimenter la grid "Tes derniers usages" de `/jeune/ma-carte`.
 *
 * Union :
 *  - `Reservation` dont `statut in [Acceptee, Passee]`
 *  - `CheckIn` (toutes lignes — un check-in vaut usage)
 *
 * Tri global par date desc, limité à `limit` éléments (défaut 10).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 6 / GUIC-386.
 */
export async function getMesUsages(
  cjsUid: string,
  limit = 10,
): Promise<UsageCarteCJS[]> {
  const [reservations, checkIns] = await Promise.all([
    prisma.reservation.findMany({
      where: { cjsUid, statut: { in: ['Acceptee', 'Passee'] } },
      orderBy: { dateReservee: 'desc' },
      take: limit,
      include: {
        ressource: { select: { nom: true } },
        centre: { select: { nom: true, slug: true } },
      },
    }),
    prisma.checkIn.findMany({
      where: { cjsUid },
      orderBy: { effectueA: 'desc' },
      take: limit,
      include: { centre: { select: { nom: true, slug: true } } },
    }),
  ])

  const resUsages: UsageCarteCJS[] = reservations.map((r) => ({
    type: 'reservation' as const,
    id: r.id,
    centreNom: r.centre.nom,
    centreSlug:
      r.centre.slug && r.centre.slug.length > 0
        ? r.centre.slug
        : slugifyCentre(r.centre.nom),
    ressourceNom: r.ressource.nom ?? null,
    date: r.dateReservee.toISOString(),
    statut: String(r.statut),
  }))

  const ciUsages: UsageCarteCJS[] = checkIns.map((c) => ({
    type: 'checkin' as const,
    id: c.id,
    centreNom: c.centre.nom,
    centreSlug:
      c.centre.slug && c.centre.slug.length > 0
        ? c.centre.slug
        : slugifyCentre(c.centre.nom),
    ressourceNom: null,
    date: c.effectueA.toISOString(),
    statut: String(c.via),
  }))

  return [...resUsages, ...ciUsages]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

/** Compte total (paginated API). */
export async function countCentres(filters?: ListCentresFilters): Promise<number> {
  const where: Prisma.CentreWhereInput = { estActif: true }
  if (filters?.region && filters.region !== 'all') {
    where.region = filters.region as Prisma.CentreWhereInput['region']
  }
  if (filters?.search) {
    where.OR = [
      { nom: { contains: filters.search } },
      { adresse: { contains: filters.search } },
    ]
  }
  return prisma.centre.count({ where })
}
