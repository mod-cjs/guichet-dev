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
  /** Jour local « YYYY-MM-DD » — regroupement semaine/mois. */
  date: string
  /** Heure « HH:MM » (clé de tri secondaire). */
  time: string
  label: string
  sub: string
  /** Atelier collectif (vs RDV individuel). */
  atelier: boolean
}

/** Jour local au format « YYYY-MM-DD ». */
export function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Lundi 00:00 de la semaine contenant `d` (semaine ISO, lundi→dimanche). */
export function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7 // lundi=0 … dimanche=6
  x.setDate(x.getDate() - dow)
  return x
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

/** Fusionne les items dérivés (réservations + événements), triés par jour puis heure. */
export function buildAgendaItems(reservations: AgendaItem[], events: AgendaItem[]): AgendaItem[] {
  return [...reservations, ...events].sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
  )
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

/** Âge révolu à partir de la date de naissance (null si inconnue). */
export function ageFromBirthdate(birth: Date | null | undefined, now: Date = new Date()): number | null {
  if (!birth) return null
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

export interface BenefStatutDescriptor {
  label: 'Actif' | 'Profil à compléter'
  tone: 'green' | 'yellow'
}

/** Seuil de complétion de profil au-delà duquel un bénéficiaire est « Actif ». */
const BENEF_STATUT_SEUIL = 50

/** Statut affiché d'un bénéficiaire selon le score de complétion de son profil. */
export function benefStatut(completionScore: number): BenefStatutDescriptor {
  return completionScore >= BENEF_STATUT_SEUIL
    ? { label: 'Actif', tone: 'green' }
    : { label: 'Profil à compléter', tone: 'yellow' }
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
/** Cookie portant le centre actif choisi (multi-centre). */
export const ACTIVE_CENTRE_COOKIE = 'conseiller_centre'

export async function getConseillerContext(
  cjsUid: string,
  preferredCentreId?: string | null,
): Promise<ConseillerContext | null> {
  // Si aucun centre n'est explicitement demandé, on lit le choix persisté (cookie).
  let preferred = preferredCentreId
  if (preferred === undefined) {
    try {
      const { cookies } = await import('next/headers')
      preferred = (await cookies()).get(ACTIVE_CENTRE_COOKIE)?.value ?? null
    } catch {
      preferred = null
    }
  }

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
  const active = pickActiveCentre(centres, preferred)
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
 * Agenda sur une plage de dates (US-5) — DÉRIVÉ, aucun modèle RendezVous :
 * réservations (créneaux du centre) + événements du centre. Les ateliers/
 * événements collectifs sont distingués (`atelier: true`). Chaque item porte son
 * jour (`date`) pour permettre les vues jour / semaine / mois.
 */
export async function getAgendaRange(centreId: string, start: Date, end: Date): Promise<AgendaItem[]> {
  const [reservations, events] = await Promise.all([
    prisma.reservation.findMany({
      where: { centreId, dateReservee: { gte: start, lte: end }, statut: { in: ['EnAttente', 'Acceptee'] } },
      select: {
        id: true,
        dateReservee: true,
        creneauDebut: true,
        utilisateur: { select: { prenom: true, nom: true } },
        ressource: { select: { nom: true } },
      },
      take: 500,
    }),
    prisma.evenement.findMany({
      where: { centreId, dateDebut: { gte: start, lte: end } },
      select: { id: true, titre: true, dateDebut: true, lieu: true },
      take: 500,
    }),
  ])

  const resaItems: AgendaItem[] = reservations.map((r) => ({
    id: `resa-${r.id}`,
    date: isoDay(r.dateReservee),
    time: r.creneauDebut,
    label: `${r.utilisateur.prenom} ${r.utilisateur.nom}`.trim(),
    sub: `Réservation · ${r.ressource.nom}`,
    atelier: false,
  }))
  const eventItems: AgendaItem[] = events.map((e) => ({
    id: `evt-${e.id}`,
    date: isoDay(e.dateDebut),
    time: hhmm(e.dateDebut),
    label: e.titre,
    sub: `Atelier collectif · ${e.lieu}`,
    atelier: true,
  }))

  return buildAgendaItems(resaItems, eventItems)
}

/** Agenda du jour — cas particulier de `getAgendaRange` sur une journée. */
export async function getAgendaDuJour(centreId: string, date: Date = new Date()): Promise<AgendaItem[]> {
  const { start, end } = dayBounds(date)
  return getAgendaRange(centreId, start, end)
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

/** Fenêtre glissante définissant un bénéficiaire « actif » (jours). */
const BENEF_ACTIF_WINDOW_DAYS = 90

/**
 * 4 KPI du dashboard (US-2), scopés centre, calculés à la volée.
 * Définitions arrêtées (spec §KPI) :
 *  - Bénéficiaires actifs : jeunes distincts ayant fréquenté le centre (check-in)
 *    sur une fenêtre glissante de 90 jours.
 *  - Réservations à valider : réservations en attente (état action).
 *  - RDV aujourd'hui : items d'agenda dérivés du jour.
 *  - Candidatures du mois : candidatures soumises ce mois par les bénéficiaires du centre.
 */
export async function getConseillerKpis(centreId: string, date: Date = new Date()): Promise<ConseillerKpi[]> {
  const mStart = monthStart(date)
  const actifSince = new Date(date)
  actifSince.setDate(actifSince.getDate() - BENEF_ACTIF_WINDOW_DAYS)

  const benefUids = await getCentreBeneficiaireUids(centreId)

  const [benefActifs, benefMois, resaAValider, agenda, candMois] = await Promise.all([
    prisma.checkIn.groupBy({ by: ['cjsUid'], where: { centreId, effectueA: { gte: actifSince } } }).then((r) => r.length),
    prisma.checkIn.groupBy({ by: ['cjsUid'], where: { centreId, effectueA: { gte: mStart } } }).then((r) => r.length),
    countReservationsAValider(centreId),
    getAgendaDuJour(centreId, date),
    benefUids.length
      ? prisma.candidature.count({ where: { cjsUid: { in: benefUids }, soumiseA: { gte: mStart } } })
      : Promise.resolve(0),
  ])

  return [
    { key: 'benef', label: 'Bénéficiaires actifs', value: benefActifs, delta: `+${benefMois} ce mois`, icon: 'users', tone: 'teal', href: '/conseiller/beneficiaires' },
    { key: 'resa', label: 'Réservations à valider', value: resaAValider, delta: 'à traiter', icon: 'calendar', tone: 'yellow', urgent: true, href: '/conseiller/reservations' },
    { key: 'rdv', label: "RDV aujourd'hui", value: agenda.length, delta: agenda.length ? 'programmés' : 'aucun', icon: 'clock', tone: 'blue', href: '/conseiller/agenda' },
    { key: 'candidatures', label: 'Candidatures du mois', value: candMois, delta: 'ce mois', icon: 'employment', tone: 'green', href: '/conseiller/beneficiaires' },
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
  justifUrl: string | null
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
      justifUrl: r.justifFileUrl ?? null,
      statutView: s.view,
      statutLabel: s.label,
      statutTone: s.tone,
      asked: ageRelatifLabel(r.createdAt),
      note: r.raisonRefusOuAnnul ?? null,
    }
  })
}

// ── Annuaire des bénéficiaires du centre (US-7/US-9) ──────────────────────

export interface BenefListItem {
  cjsUid: string
  name: string
  initials: string
  age: number | null
  niveau: string | null
  candidatures: number
  commune: string
  completion: number
  statutLabel: BenefStatutDescriptor['label']
  statutTone: BenefStatutDescriptor['tone']
  lastVisitLabel: string
  tel: string | null
}

export interface CentreBeneficiaires {
  total: number
  items: BenefListItem[]
}

/**
 * Annuaire des bénéficiaires rattachés au centre (via check-in / réservation),
 * avec recherche par nom (US-7). Scopé au centre du conseiller.
 */
export type BenefStatutFilter = 'tous' | 'actif' | 'incomplet'

export async function getCentreBeneficiaires(
  centreId: string,
  query?: string,
  statut: BenefStatutFilter = 'tous',
  limit = 50,
): Promise<CentreBeneficiaires> {
  const uids = await getCentreBeneficiaireUids(centreId)
  if (uids.length === 0) return { total: 0, items: [] }

  const q = query?.trim()
  const and: Prisma.UtilisateurWhereInput[] = [{ cjsUid: { in: uids } }]
  if (q) and.push({ OR: [{ prenom: { contains: q } }, { nom: { contains: q } }] })
  if (statut === 'actif') and.push({ profil: { completionScore: { gte: BENEF_STATUT_SEUIL } } })
  if (statut === 'incomplet') and.push({ OR: [{ profil: { is: null } }, { profil: { completionScore: { lt: BENEF_STATUT_SEUIL } } }] })
  const where: Prisma.UtilisateurWhereInput = { AND: and }

  const [total, users, lastVisits] = await Promise.all([
    prisma.utilisateur.count({ where }),
    prisma.utilisateur.findMany({
      where,
      select: {
        cjsUid: true,
        prenom: true,
        nom: true,
        telephone: true,
        region: true,
        dateNaissance: true,
        profil: { select: { niveauEtude: true, completionScore: true } },
        _count: { select: { candidatures: true } },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      take: limit,
    }),
    prisma.checkIn.groupBy({
      by: ['cjsUid'],
      where: { centreId, cjsUid: { in: uids } },
      _max: { effectueA: true },
    }),
  ])

  const lastById = new Map<string, Date | null>()
  for (const v of lastVisits) lastById.set(v.cjsUid, v._max.effectueA)

  const items: BenefListItem[] = users.map((u) => {
    const completion = u.profil?.completionScore ?? 0
    const st = benefStatut(completion)
    const last = lastById.get(u.cjsUid) ?? null
    return {
      cjsUid: u.cjsUid,
      name: `${u.prenom} ${u.nom}`.trim(),
      initials: buildInitials(u.prenom, u.nom),
      age: ageFromBirthdate(u.dateNaissance),
      niveau: u.profil?.niveauEtude ?? null,
      candidatures: u._count.candidatures,
      commune: u.region ? String(u.region) : '—',
      completion,
      statutLabel: st.label,
      statutTone: st.tone,
      lastVisitLabel: last ? ageRelatifLabel(last) : 'Jamais',
      tel: u.telephone ?? null,
    }
  })

  return { total, items }
}

// ── Check-in présence du jour (US-6) ──────────────────────────────────────

export interface CheckinDuJour {
  id: string
  who: string
  initials: string
  time: string
  via: string
}

/** Check-ins du jour au centre (présence) — réutilise le modèle CheckIn. */
export async function getCheckinsDuJour(centreId: string, date: Date = new Date()): Promise<CheckinDuJour[]> {
  const { start, end } = dayBounds(date)
  const rows = await prisma.checkIn.findMany({
    where: { centreId, effectueA: { gte: start, lte: end } },
    select: {
      id: true,
      effectueA: true,
      via: true,
      utilisateur: { select: { prenom: true, nom: true } },
    },
    orderBy: { effectueA: 'desc' },
    take: 100,
  })
  return rows.map((c) => ({
    id: c.id,
    who: `${c.utilisateur.prenom} ${c.utilisateur.nom}`.trim(),
    initials: buildInitials(c.utilisateur.prenom, c.utilisateur.nom),
    time: hhmm(c.effectueA),
    via: String(c.via),
  }))
}

// ── Fiche bénéficiaire détaillée (US-7) ───────────────────────────────────

export interface BenefReservationHisto {
  id: string
  kind: RessourceKind
  kindIcon: IconName
  ressourceNom: string
  dateLabel: string
  slot: string
  statutView: StatutView
  statutLabel: string
  statutTone: StatutViewDescriptor['tone']
}

export interface BeneficiaireDetail {
  cjsUid: string
  name: string
  initials: string
  age: number | null
  genre: string | null
  commune: string
  niveau: string | null
  tel: string | null
  memberSince: string
  completion: number
  statutLabel: BenefStatutDescriptor['label']
  statutTone: BenefStatutDescriptor['tone']
  candidatures: number
  lastActivity: string
  reservations: BenefReservationHisto[]
}

const MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/**
 * Fiche d'un bénéficiaire — uniquement s'il est rattaché au centre du conseiller
 * (a fréquenté le centre via check-in ou réservation). Sinon `null` (hors périmètre).
 */
export async function getBeneficiaireDetail(centreId: string, cjsUid: string): Promise<BeneficiaireDetail | null> {
  // Périmètre : le bénéficiaire doit avoir un lien avec ce centre.
  const [rattache, u, reservations, lastCheckin] = await Promise.all([
    Promise.all([
      prisma.checkIn.count({ where: { centreId, cjsUid } }),
      prisma.reservation.count({ where: { centreId, cjsUid } }),
    ]).then(([a, b]) => a + b > 0),
    prisma.utilisateur.findUnique({
      where: { cjsUid },
      select: {
        cjsUid: true, prenom: true, nom: true, telephone: true, region: true,
        genre: true, dateNaissance: true, createdAt: true,
        profil: { select: { niveauEtude: true, completionScore: true } },
        _count: { select: { candidatures: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { centreId, cjsUid },
      select: {
        id: true, dateReservee: true, creneauDebut: true, creneauFin: true, statut: true,
        ressource: { select: { nom: true, type: true } },
      },
      orderBy: { dateReservee: 'desc' },
      take: 8,
    }),
    prisma.checkIn.findFirst({ where: { centreId, cjsUid }, orderBy: { effectueA: 'desc' }, select: { effectueA: true } }),
  ])

  if (!u || !rattache) return null

  const completion = u.profil?.completionScore ?? 0
  const st = benefStatut(completion)

  return {
    cjsUid: u.cjsUid,
    name: `${u.prenom} ${u.nom}`.trim(),
    initials: buildInitials(u.prenom, u.nom),
    age: ageFromBirthdate(u.dateNaissance),
    genre: u.genre ? String(u.genre) : null,
    commune: u.region ? String(u.region) : '—',
    niveau: u.profil?.niveauEtude ?? null,
    tel: u.telephone ?? null,
    memberSince: (() => { const s = MONTH_YEAR.format(u.createdAt); return s.charAt(0).toUpperCase() + s.slice(1) })(),
    completion,
    statutLabel: st.label,
    statutTone: st.tone,
    candidatures: u._count.candidatures,
    lastActivity: lastCheckin ? ageRelatifLabel(lastCheckin.effectueA) : 'Jamais',
    reservations: reservations.map((r) => {
      const k = mapRessourceKind(String(r.ressource.type))
      const sv = mapStatutView(String(r.statut))
      return {
        id: r.id, kind: k.kind, kindIcon: k.icon, ressourceNom: r.ressource.nom,
        dateLabel: fmtDateLabel(r.dateReservee), slot: `${r.creneauDebut} – ${r.creneauFin}`,
        statutView: sv.view, statutLabel: sv.label, statutTone: sv.tone,
      }
    }),
  }
}

// ── Publications du centre (GUIC-477) ─────────────────────────────────────

export interface PublicationItem {
  id: string
  titre: string
  type: string
  /** Tonalité de la pastille type (design v4 MobAgentPublish). */
  kindTone: 'teal' | 'blue' | 'yellow' | 'green'
  dateLabel: string
  statut: string
  statutLabel: string
  statutTone: 'teal' | 'green' | 'yellow' | 'grey' | 'red'
  inscriptions: number
  capacite: number | null
}

const EVT_KIND_TONE: Record<string, PublicationItem['kindTone']> = {
  Atelier: 'teal',
  Formation: 'green',
  Forum: 'blue',
  Conference: 'blue',
  Webinar: 'yellow',
  Cours: 'teal',
}

const PUB_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const EVT_STATUT: Record<string, { label: string; tone: PublicationItem['statutTone'] }> = {
  en_relecture: { label: 'En relecture', tone: 'yellow' },
  a_venir: { label: 'Publié', tone: 'green' },
  en_cours: { label: 'En cours', tone: 'teal' },
  termine: { label: 'Terminé', tone: 'grey' },
  annule: { label: 'Annulé', tone: 'grey' },
  refuse: { label: 'Refusé', tone: 'red' },
}

/** Publications (événements) du centre du conseiller, plus récentes d'abord. */
export async function getPublicationsCentre(centreId: string, limit = 50): Promise<PublicationItem[]> {
  const rows = await prisma.evenement.findMany({
    where: { centreId },
    select: {
      id: true, titre: true, type: true, statut: true, dateDebut: true, capaciteMax: true,
      _count: { select: { inscriptions: true } },
    },
    orderBy: { dateDebut: 'desc' },
    take: limit,
  })
  return rows.map((e) => {
    const s = EVT_STATUT[String(e.statut)] ?? { label: String(e.statut), tone: 'grey' as const }
    return {
      id: e.id,
      titre: e.titre,
      type: String(e.type),
      kindTone: EVT_KIND_TONE[String(e.type)] ?? 'teal',
      dateLabel: PUB_DATE.format(e.dateDebut),
      statut: String(e.statut),
      statutLabel: s.label,
      statutTone: s.tone,
      inscriptions: e._count.inscriptions,
      capacite: e.capaciteMax ?? null,
    }
  })
}
