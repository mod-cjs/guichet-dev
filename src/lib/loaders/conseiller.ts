import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { IconName } from '@/components/ui/Icon'
import { ageRelatifLabel } from '@/lib/loaders/notifications'

/**
 * GUIC-493 / GUIC-501 — Loaders de l'Espace conseiller (Lot 8).
 *
 * Le conseiller est authentifié en SSO (`getSession()`), et son périmètre est
 * défini par ses rattachements `AgentCentre` (cjs_uid ↔ centre_id). Toutes les
 * données de l'espace sont scopées au centre actif. Voir
 * `.agent_context/specs/M8-espace-conseiller.md`.
 */

export interface ConseillerCentre {
  id: string
  nom: string
}

export interface ConseillerContext {
  cjsUid: string
  prenom: string
  nom: string
  /** Initiales pour l'avatar de la sidebar. */
  initials: string
  /** Rôle AgentCentre du centre actif (ex. « conseiller »). */
  role: string
  /** Centre de rattachement actif. */
  centreId: string
  centreNom: string
  /** Tous les centres de rattachement (multi-centre). */
  centres: ConseillerCentre[]
}

// ── KPI & dashboard (Phase 2 — US-2/US-3/US-5) ────────────────────────────

export type RessourceKind = 'salle' | 'vehicule' | 'poste' | 'atelier' | 'equipement'

export interface RessourceKindDescriptor {
  kind: RessourceKind
  label: string
  icon: IconName
}

export interface ConseillerKpi {
  key: 'benef' | 'resa' | 'rdv' | 'candidatures'
  label: string
  value: number
  delta: string
  icon: IconName
  tone: 'teal' | 'yellow' | 'blue' | 'green'
  /** Carte urgente (état action) — Réservations à valider. */
  urgent?: boolean
  /** Cible de navigation au clic. */
  href?: string
}

export interface ReservationAValider {
  id: string
  kind: RessourceKind
  kindLabel: string
  kindIcon: IconName
  ressourceNom: string
  who: string
  dateLabel: string
  slot: string
}

export interface AgendaItem {
  id: string
  /** Heure « HH:MM » (clé de tri). */
  time: string
  label: string
  sub: string
  /** Atelier collectif (vs RDV individuel). */
  atelier: boolean
}

/** Mappe `TypeRessourceCentre` (modèle) vers les tons/icônes du design v4 (Lot 7/8). */
export function mapRessourceKind(type: string): RessourceKindDescriptor {
  switch (type) {
    case 'Salle':
      return { kind: 'salle', label: 'Salle', icon: 'users' }
    case 'Vehicule':
      return { kind: 'vehicule', label: 'Véhicule', icon: 'car' }
    case 'Poste_info':
      return { kind: 'poste', label: 'Poste info', icon: 'desktop' }
    case 'Atelier_recurrent':
      return { kind: 'atelier', label: 'Atelier', icon: 'learning' }
    default:
      return { kind: 'equipement', label: 'Équipement', icon: 'resources' }
  }
}

/** Fusionne les items dérivés (réservations + événements) et trie par heure croissante. */
export function buildAgendaItems(reservations: AgendaItem[], events: AgendaItem[]): AgendaItem[] {
  return [...reservations, ...events].sort((a, b) => a.time.localeCompare(b.time))
}

export type StatutView = 'attente' | 'acceptee' | 'refusee' | 'annulee' | 'passee' | 'nonhonoree'

export interface StatutViewDescriptor {
  view: StatutView
  label: string
  tone: 'yellow' | 'green' | 'red' | 'grey'
}

/** Mappe `StatutReservation` (modèle) vers la vue design (pill statut). */
export function mapStatutView(statut: string): StatutViewDescriptor {
  switch (statut) {
    case 'EnAttente':
      return { view: 'attente', label: 'En attente', tone: 'yellow' }
    case 'Acceptee':
      return { view: 'acceptee', label: 'Acceptée', tone: 'green' }
    case 'Refusee':
      return { view: 'refusee', label: 'Refusée', tone: 'red' }
    case 'AnnuleeParJeune':
    case 'AnnuleeParCentre':
      return { view: 'annulee', label: 'Annulée', tone: 'grey' }
    case 'NonHonoree':
      return { view: 'nonhonoree', label: 'Non honorée', tone: 'red' }
    case 'Passee':
      return { view: 'passee', label: 'Passée', tone: 'grey' }
    default:
      return { view: 'passee', label: statut, tone: 'grey' }
  }
}

/** Initiales (2 lettres max) à partir du prénom/nom, en majuscules. */
export function buildInitials(prenom?: string | null, nom?: string | null): string {
  const p = (prenom ?? '').trim()
  const n = (nom ?? '').trim()
  const a = p ? p[0] : ''
  const b = n ? n[0] : ''
  return `${a}${b}`.toUpperCase()
}

/**
 * Choisit le centre actif parmi les rattachements : le centre préféré s'il
 * existe, sinon le premier. `null` si le conseiller n'a aucun rattachement.
 */
export function pickActiveCentre(
  centres: ConseillerCentre[],
  preferredId?: string | null,
): ConseillerCentre | null {
  if (centres.length === 0) return null
  if (preferredId) {
    const found = centres.find((c) => c.id === preferredId)
    if (found) return found
  }
  return centres[0]
}

/**
 * Contexte conseiller pour le chrome (sidebar/topbar) et le guard du layout.
 * Retourne `null` si l'utilisateur n'est rattaché à aucun centre — le layout
 * l'interprète comme « pas conseiller » et redirige.
 */
export async function getConseillerContext(
  cjsUid: string,
  preferredCentreId?: string | null,
): Promise<ConseillerContext | null> {
  const [user, links] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { cjsUid },
      select: { prenom: true, nom: true },
    }),
    prisma.agentCentre.findMany({
      where: { cjsUid },
      select: { role: true, centre: { select: { id: true, nom: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (links.length === 0) return null

  const centres: ConseillerCentre[] = links.map((l) => ({ id: l.centre.id, nom: l.centre.nom }))
  const active = pickActiveCentre(centres, preferredCentreId)
  // `active` ne peut être null ici (links.length > 0) mais on garde le garde-fou.
  if (!active) return null

  return {
    cjsUid,
    prenom: user?.prenom ?? '',
    nom: user?.nom ?? '',
    initials: buildInitials(user?.prenom, user?.nom),
    role: links[0].role,
    centreId: active.id,
    centreNom: active.nom,
    centres,
  }
}

// ── Requêtes dashboard (scopées centre) ───────────────────────────────────

function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date); start.setHours(0, 0, 0, 0)
  const end = new Date(date); end.setHours(23, 59, 59, 999)
  return { start, end }
}

function monthStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

const DATE_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
function fmtDateLabel(d: Date): string {
  const s = DATE_LABEL.format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function hhmm(d: Date): string {
  return d.toTimeString().slice(0, 5)
}

/** Nombre de réservations à valider (statut EnAttente) — badge sidebar + KPI. */
export async function countReservationsAValider(centreId: string): Promise<number> {
  return prisma.reservation.count({ where: { centreId, statut: 'EnAttente' } })
}

/** File des réservations à valider (US-3) — les plus anciennes d'abord. */
export async function getReservationsAValider(
  centreId: string,
  limit = 3,
): Promise<ReservationAValider[]> {
  const rows = await prisma.reservation.findMany({
    where: { centreId, statut: 'EnAttente' },
    select: {
      id: true,
      dateReservee: true,
      creneauDebut: true,
      creneauFin: true,
      utilisateur: { select: { prenom: true, nom: true } },
      ressource: { select: { nom: true, type: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  return rows.map((r) => {
    const k = mapRessourceKind(String(r.ressource.type))
    return {
      id: r.id,
      kind: k.kind,
      kindLabel: k.label,
      kindIcon: k.icon,
      ressourceNom: r.ressource.nom,
      who: `${r.utilisateur.prenom} ${r.utilisateur.nom}`.trim(),
      dateLabel: fmtDateLabel(r.dateReservee),
      slot: `${r.creneauDebut} – ${r.creneauFin}`,
    }
  })
}

/**
 * Agenda du jour (US-5) — DÉRIVÉ, aucun modèle RendezVous : réservations
 * (créneaux du centre) + événements du centre du jour. Les ateliers/événements
 * collectifs sont distingués (`atelier: true`). Voir la spec M8-espace-conseiller.
 */
export async function getAgendaDuJour(centreId: string, date: Date = new Date()): Promise<AgendaItem[]> {
  const { start, end } = dayBounds(date)
  const [reservations, events] = await Promise.all([
    prisma.reservation.findMany({
      where: { centreId, dateReservee: { gte: start, lte: end }, statut: { in: ['EnAttente', 'Acceptee'] } },
      select: {
        id: true,
        creneauDebut: true,
        utilisateur: { select: { prenom: true, nom: true } },
        ressource: { select: { nom: true } },
      },
      take: 50,
    }),
    prisma.evenement.findMany({
      where: { centreId, dateDebut: { gte: start, lte: end } },
      select: { id: true, titre: true, dateDebut: true, lieu: true },
      take: 50,
    }),
  ])

  const resaItems: AgendaItem[] = reservations.map((r) => ({
    id: `resa-${r.id}`,
    time: r.creneauDebut,
    label: `${r.utilisateur.prenom} ${r.utilisateur.nom}`.trim(),
    sub: `Réservation · ${r.ressource.nom}`,
    atelier: false,
  }))
  const eventItems: AgendaItem[] = events.map((e) => ({
    id: `evt-${e.id}`,
    time: hhmm(e.dateDebut),
    label: e.titre,
    sub: `Atelier collectif · ${e.lieu}`,
    atelier: true,
  }))

  return buildAgendaItems(resaItems, eventItems)
}

/** Ensemble des bénéficiaires rattachés au centre (via check-ins ou réservations). */
async function getCentreBeneficiaireUids(centreId: string): Promise<string[]> {
  const [checkins, resas] = await Promise.all([
    prisma.checkIn.groupBy({ by: ['cjsUid'], where: { centreId } }),
    prisma.reservation.groupBy({ by: ['cjsUid'], where: { centreId } }),
  ])
  const set = new Set<string>()
  for (const c of checkins) set.add(c.cjsUid)
  for (const r of resas) set.add(r.cjsUid)
  return [...set]
}

/**
 * 4 KPI du dashboard (US-2), scopés centre, calculés à la volée.
 * Définitions (documentées dans la spec) :
 *  - Bénéficiaires actifs : jeunes distincts ayant fréquenté le centre (check-in).
 *  - Réservations à valider : réservations en attente (état action).
 *  - RDV aujourd'hui : items d'agenda dérivés du jour.
 *  - Candidatures du mois : candidatures soumises ce mois par les bénéficiaires du centre.
 */
export async function getConseillerKpis(centreId: string, date: Date = new Date()): Promise<ConseillerKpi[]> {
  const mStart = monthStart(date)

  const benefUids = await getCentreBeneficiaireUids(centreId)

  const [benefActifs, benefMois, resaAValider, agenda, candMois] = await Promise.all([
    prisma.checkIn.groupBy({ by: ['cjsUid'], where: { centreId } }).then((r) => r.length),
    prisma.checkIn.groupBy({ by: ['cjsUid'], where: { centreId, effectueA: { gte: mStart } } }).then((r) => r.length),
    countReservationsAValider(centreId),
    getAgendaDuJour(centreId, date),
    benefUids.length
      ? prisma.candidature.count({ where: { cjsUid: { in: benefUids }, soumiseA: { gte: mStart } } })
      : Promise.resolve(0),
  ])

  return [
    { key: 'benef', label: 'Bénéficiaires actifs', value: benefActifs, delta: `+${benefMois} ce mois`, icon: 'users', tone: 'teal' },
    { key: 'resa', label: 'Réservations à valider', value: resaAValider, delta: 'à traiter', icon: 'calendar', tone: 'yellow', urgent: true, href: '/conseiller/reservations' },
    { key: 'rdv', label: "RDV aujourd'hui", value: agenda.length, delta: agenda.length ? 'programmés' : 'aucun', icon: 'clock', tone: 'blue' },
    { key: 'candidatures', label: 'Candidatures du mois', value: candMois, delta: 'ce mois', icon: 'employment', tone: 'green' },
  ]
}

// ── Écran complet Réservations (US-3/US-4) ────────────────────────────────

export type ReservationTab = 'all' | 'attente' | 'acceptee' | 'refusee'

export interface ReservationCounts {
  all: number
  attente: number
  acceptee: number
  refusee: number
}

export interface ReservationListItem {
  id: string
  kind: RessourceKind
  kindLabel: string
  kindIcon: IconName
  ressourceNom: string
  who: string
  initials: string
  dateLabel: string
  slot: string
  people: number
  motif: string
  justif: boolean
  statutView: StatutView
  statutLabel: string
  statutTone: StatutViewDescriptor['tone']
  asked: string
  /** Motif de refus / note d'annulation, le cas échéant. */
  note: string | null
}

/** Compteurs par onglet (Toutes / À valider / Acceptées / Refusées). */
export async function getReservationsCounts(centreId: string): Promise<ReservationCounts> {
  const [all, attente, acceptee, refusee] = await Promise.all([
    prisma.reservation.count({ where: { centreId } }),
    prisma.reservation.count({ where: { centreId, statut: 'EnAttente' } }),
    prisma.reservation.count({ where: { centreId, statut: 'Acceptee' } }),
    prisma.reservation.count({ where: { centreId, statut: 'Refusee' } }),
  ])
  return { all, attente, acceptee, refusee }
}

function tabStatutFilter(tab: ReservationTab): Prisma.ReservationWhereInput {
  switch (tab) {
    case 'attente':
      return { statut: 'EnAttente' }
    case 'acceptee':
      return { statut: 'Acceptee' }
    case 'refusee':
      return { statut: 'Refusee' }
    default:
      return {}
  }
}

/** Liste des réservations du centre pour l'écran complet, filtrée par onglet. */
export async function getReservationsListe(
  centreId: string,
  tab: ReservationTab = 'attente',
  limit = 50,
): Promise<ReservationListItem[]> {
  const rows = await prisma.reservation.findMany({
    where: { centreId, ...tabStatutFilter(tab) },
    select: {
      id: true,
      dateReservee: true,
      creneauDebut: true,
      creneauFin: true,
      nombrePersonnes: true,
      motif: true,
      justifFileUrl: true,
      statut: true,
      raisonRefusOuAnnul: true,
      createdAt: true,
      utilisateur: { select: { prenom: true, nom: true } },
      ressource: { select: { nom: true, type: true } },
    },
    // À valider d'abord (plus anciennes), sinon les plus récentes.
    orderBy: tab === 'attente' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    take: limit,
  })

  return rows.map((r) => {
    const k = mapRessourceKind(String(r.ressource.type))
    const s = mapStatutView(String(r.statut))
    return {
      id: r.id,
      kind: k.kind,
      kindLabel: k.label,
      kindIcon: k.icon,
      ressourceNom: r.ressource.nom,
      who: `${r.utilisateur.prenom} ${r.utilisateur.nom}`.trim(),
      initials: buildInitials(r.utilisateur.prenom, r.utilisateur.nom),
      dateLabel: fmtDateLabel(r.dateReservee),
      slot: `${r.creneauDebut} – ${r.creneauFin}`,
      people: r.nombrePersonnes,
      motif: r.motif,
      justif: Boolean(r.justifFileUrl),
      statutView: s.view,
      statutLabel: s.label,
      statutTone: s.tone,
      asked: ageRelatifLabel(r.createdAt),
      note: r.raisonRefusOuAnnul ?? null,
    }
  })
}
