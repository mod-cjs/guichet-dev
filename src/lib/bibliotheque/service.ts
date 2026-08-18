// Service métier bibliothèque physique des centres (Lot 3 Yaye, GUIC-274).
//
// Couche domaine RÉUTILISÉE par :
//   - les routes HTTP (`src/app/api/bibliotheque/*`)
//   - la passerelle Yaye (`src/lib/ia/bibliotheque-gateway.ts`)
//
// Toute la logique métier (disponibilité, anti-doublon, transitions de statut,
// RBAC centre du staff) vit ICI — les routes ne font que parser/authentifier/formater.
//
// Spec : .agent_context/specs/M4-bibliotheque.md

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { Prisma, StatutEmprunt } from '@prisma/client'

/** Durée d'emprunt par défaut (jours) — date de retour prévue = confirmation + N jours. */
export const DUREE_EMPRUNT_JOURS = 14

/**
 * Re-synchronise un exemplaire vers le Knowledge Graph après un changement de statut
 * (emprunt/retour). Import PARESSEUX + fire-and-forget : le graphe est un read-model
 * reconstructible, son indisponibilité ne doit jamais casser un emprunt. No-op si
 * Neo4j non configuré (géré côté projecteur).
 */
function syncExemplaireGraph(exemplaireId: string): void {
  void import('@/lib/ia/graph/projection/project')
    .then((m) => m.syncExemplaireToGraph(exemplaireId))
    .catch((err) => logger.warn('[biblio] sync graphe exemplaire échouée (fail-soft)', { exemplaireId, err: String(err) }))
}

/** Idem pour un livre (catalogue). Fail-soft, fire-and-forget. */
function syncLivreGraph(livreId: string): void {
  void import('@/lib/ia/graph/projection/project')
    .then((m) => m.syncLivreToGraph(livreId))
    .catch((err) => logger.warn('[biblio] sync graphe livre échouée (fail-soft)', { livreId, err: String(err) }))
}

// ── Erreurs domaine ───────────────────────────────────────────────

export type BiblioErrorCode =
  | 'LIVRE_NOT_FOUND'
  | 'EXEMPLAIRE_NOT_FOUND'
  | 'EXEMPLAIRE_INDISPONIBLE'
  | 'EMPRUNT_NOT_FOUND'
  | 'EMPRUNT_DEJA_EN_COURS'
  | 'EMPRUNT_DEJA_CONFIRME'
  | 'EMPRUNT_DEJA_RENDU'
  | 'EMPRUNT_NON_CONFIRMABLE'
  | 'DOUBLON_EMPRUNT'
  | 'CENTRE_INTERDIT'

export const BIBLIO_ERROR_STATUS: Record<BiblioErrorCode, number> = {
  LIVRE_NOT_FOUND: 404,
  EXEMPLAIRE_NOT_FOUND: 404,
  EXEMPLAIRE_INDISPONIBLE: 409,
  EMPRUNT_NOT_FOUND: 404,
  EMPRUNT_DEJA_EN_COURS: 409,
  EMPRUNT_DEJA_CONFIRME: 409,
  EMPRUNT_DEJA_RENDU: 409,
  EMPRUNT_NON_CONFIRMABLE: 409,
  DOUBLON_EMPRUNT: 409,
  CENTRE_INTERDIT: 403,
}

const BIBLIO_ERROR_MESSAGES: Record<BiblioErrorCode, string> = {
  LIVRE_NOT_FOUND: 'Livre introuvable.',
  EXEMPLAIRE_NOT_FOUND: 'Exemplaire introuvable.',
  EXEMPLAIRE_INDISPONIBLE: "Cet exemplaire n'est plus disponible.",
  EMPRUNT_NOT_FOUND: 'Emprunt introuvable.',
  EMPRUNT_DEJA_EN_COURS: 'Un emprunt est déjà en cours pour cet exemplaire.',
  EMPRUNT_DEJA_CONFIRME: 'Cet emprunt est déjà confirmé.',
  EMPRUNT_DEJA_RENDU: 'Cet emprunt a déjà été retourné.',
  EMPRUNT_NON_CONFIRMABLE: "Cet emprunt ne peut pas être confirmé dans son état actuel.",
  DOUBLON_EMPRUNT: 'Tu as déjà un emprunt initié pour cet exemplaire.',
  CENTRE_INTERDIT: "Cet exemplaire n'appartient pas à ton centre.",
}

export class BiblioDomainError extends Error {
  constructor(public readonly code: BiblioErrorCode) {
    super(BIBLIO_ERROR_MESSAGES[code])
    this.name = 'BiblioDomainError'
  }
  get status(): number {
    return BIBLIO_ERROR_STATUS[this.code]
  }
}

// ── Vues (DTO) ────────────────────────────────────────────────────

export interface EmplacementVue {
  exemplaireId: string
  centreId: string
  centreNom: string
  rayon: string
  etagere: string
  position: string
  statut: string
}

export interface LivreVue {
  id: string
  titre: string
  auteur: string
  isbn: string | null
  theme: string
  niveau: string | null
  langue: string
  resume: string | null
  couvertureUrl: string | null
  exemplairesTotal: number
  exemplairesDisponibles: number
  /** Emplacements des exemplaires DISPONIBLES (pour guider l'usager au centre). */
  emplacements: EmplacementVue[]
}

export interface EmpruntVue {
  id: string
  statut: StatutEmprunt
  livre: { id: string; titre: string; auteur: string }
  exemplaire: { id: string; codeBarre: string; centreId: string; centreNom: string; rayon: string; etagere: string; position: string }
  initieA: string
  confirmeA: string | null
  dateRetourPrevue: string | null
  renduA: string | null
  /** cjsUid du staff ayant confirmé le retrait (scan badge). GUIC-522 F-09. */
  confirmePar: string | null
  /** Nom + prénom du bénéficiaire (résolu via cjsUid→Utilisateur). `null` si non résolu
   *  dans ce contexte (ex. le bénéficiaire consultant ses propres emprunts). GUIC-522 F-09. */
  emprunteur: { nom: string; prenom: string } | null
}

// ── Recherche & fiche (GUIC-342) ──────────────────────────────────

export interface SearchLivresParams {
  q?: string
  theme?: string
  niveau?: string
  centreId?: string
  page?: number
  pageSize?: number
}

export interface SearchLivresResult {
  livres: LivreVue[]
  total: number
  page: number
  pageSize: number
}

function toEmplacement(ex: {
  id: string
  centreId: string
  rayon: string
  etagere: string
  position: string
  statut: string
  centre: { nom: string }
}): EmplacementVue {
  return {
    exemplaireId: ex.id,
    centreId: ex.centreId,
    centreNom: ex.centre.nom,
    rayon: ex.rayon,
    etagere: ex.etagere,
    position: ex.position,
    statut: String(ex.statut),
  }
}

function toLivreVue(livre: {
  id: string
  titre: string
  auteur: string
  isbn: string | null
  theme: string
  niveau: string | null
  langue: string
  resume: string | null
  couvertureUrl: string | null
  exemplaires: Array<{
    id: string
    centreId: string
    rayon: string
    etagere: string
    position: string
    statut: string
    centre: { nom: string }
  }>
}): LivreVue {
  const dispo = livre.exemplaires.filter((e) => e.statut === 'disponible')
  return {
    id: livre.id,
    titre: livre.titre,
    auteur: livre.auteur,
    isbn: livre.isbn,
    theme: livre.theme,
    niveau: livre.niveau,
    langue: livre.langue,
    resume: livre.resume,
    couvertureUrl: livre.couvertureUrl,
    exemplairesTotal: livre.exemplaires.length,
    exemplairesDisponibles: dispo.length,
    emplacements: dispo.map(toEmplacement),
  }
}

/** Recherche de livres par texte libre (titre/auteur), thème, niveau, centre. */
export async function searchLivres(params: SearchLivresParams): Promise<SearchLivresResult> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20))
  const q = params.q?.trim()

  const where: Prisma.LivreWhereInput = {}
  if (q) {
    where.OR = [{ titre: { contains: q } }, { auteur: { contains: q } }, { isbn: { contains: q } }]
  }
  if (params.theme) where.theme = params.theme
  if (params.niveau) where.niveau = params.niveau
  // Filtre centre : ne garder que les livres ayant au moins un exemplaire dans ce centre.
  if (params.centreId) where.exemplaires = { some: { centreId: params.centreId } }

  const [total, livres] = await Promise.all([
    prisma.livre.count({ where }),
    prisma.livre.findMany({
      where,
      include: {
        exemplaires: {
          where: params.centreId ? { centreId: params.centreId } : undefined,
          include: { centre: { select: { nom: true } } },
        },
      },
      orderBy: { titre: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return { livres: livres.map(toLivreVue), total, page, pageSize }
}

/**
 * Catalogue de gestion d'un centre (bibliothécaire) : livres ayant ≥1 exemplaire dans
 * le centre, avec TOUS leurs exemplaires de ce centre (tous statuts — disponible,
 * emprunté, réservé, indisponible), pour permettre l'édition/suppression. Contrairement
 * à `searchLivres`, `emplacements` n'est PAS filtré aux seuls disponibles.
 */
export async function getCatalogueCentre(centreId: string): Promise<LivreVue[]> {
  const livres = await prisma.livre.findMany({
    where: { exemplaires: { some: { centreId } } },
    include: { exemplaires: { where: { centreId }, include: { centre: { select: { nom: true } } } } },
    orderBy: { titre: 'asc' },
    take: 200,
  })
  return livres.map((livre) => ({
    id: livre.id,
    titre: livre.titre,
    auteur: livre.auteur,
    isbn: livre.isbn,
    theme: livre.theme,
    niveau: livre.niveau,
    langue: livre.langue,
    resume: livre.resume,
    couvertureUrl: livre.couvertureUrl,
    exemplairesTotal: livre.exemplaires.length,
    exemplairesDisponibles: livre.exemplaires.filter((e) => e.statut === 'disponible').length,
    emplacements: livre.exemplaires.map(toEmplacement), // TOUS les exemplaires du centre
  }))
}

// ── Supervision admin (cross-centres, GUIC-344) ──────────────────────────────

export interface BiblioCentreStat {
  centreId: string
  centreNom: string
  exemplairesTotal: number
  disponibles: number
  empruntes: number
  /** Emprunts non terminés (initie + en_cours + en_retard). */
  empruntsActifs: number
  /** Emprunts actifs dont la date de retour prévue est dépassée. */
  enRetard: number
}

export interface BiblioStatsGlobal {
  livresTotal: number
  centres: BiblioCentreStat[]
  totaux: Omit<BiblioCentreStat, 'centreId' | 'centreNom'>
}

/** Statistiques d'emprunts par centre + totaux (vue de supervision admin). */
export async function getBiblioStatsGlobal(now: Date = new Date()): Promise<BiblioStatsGlobal> {
  const [centres, exGroups, actifs, livresTotal] = await Promise.all([
    prisma.centre.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
    prisma.exemplaire.groupBy({ by: ['centreId', 'statut'], _count: { _all: true } }),
    prisma.emprunt.findMany({
      where: { statut: { in: ['initie', 'en_cours', 'en_retard'] } },
      select: { dateRetourPrevue: true, exemplaire: { select: { centreId: true } } },
    }),
    prisma.livre.count(),
  ])

  const stat = new Map<string, BiblioCentreStat>(
    centres.map((c) => [c.id, {
      centreId: c.id, centreNom: c.nom,
      exemplairesTotal: 0, disponibles: 0, empruntes: 0, empruntsActifs: 0, enRetard: 0,
    }]),
  )

  for (const g of exGroups) {
    const s = stat.get(g.centreId)
    if (!s) continue
    const n = g._count._all
    s.exemplairesTotal += n
    if (g.statut === 'disponible') s.disponibles += n
    if (g.statut === 'emprunte') s.empruntes += n
  }
  for (const e of actifs) {
    const s = stat.get(e.exemplaire.centreId)
    if (!s) continue
    s.empruntsActifs += 1
    if (e.dateRetourPrevue && e.dateRetourPrevue < now) s.enRetard += 1
  }

  const centresStat = [...stat.values()]
  const totaux = centresStat.reduce(
    (acc, c) => ({
      exemplairesTotal: acc.exemplairesTotal + c.exemplairesTotal,
      disponibles: acc.disponibles + c.disponibles,
      empruntes: acc.empruntes + c.empruntes,
      empruntsActifs: acc.empruntsActifs + c.empruntsActifs,
      enRetard: acc.enRetard + c.enRetard,
    }),
    { exemplairesTotal: 0, disponibles: 0, empruntes: 0, empruntsActifs: 0, enRetard: 0 },
  )

  return { livresTotal, centres: centresStat, totaux }
}

/** Fiche d'un livre : métadonnées + exemplaires (+ emplacements). */
export async function getLivre(id: string): Promise<LivreVue> {
  const livre = await prisma.livre.findUnique({
    where: { id },
    include: { exemplaires: { include: { centre: { select: { nom: true } } } } },
  })
  if (!livre) throw new BiblioDomainError('LIVRE_NOT_FOUND')
  return toLivreVue(livre)
}

// ── Emprunt / retour (GUIC-343) ───────────────────────────────────

const ACTIVE_STATUTS: StatutEmprunt[] = ['initie', 'en_cours', 'en_retard']

async function toEmpruntVue(empruntId: string): Promise<EmpruntVue> {
  const e = await prisma.emprunt.findUniqueOrThrow({
    where: { id: empruntId },
    include: { exemplaire: { include: { livre: true, centre: { select: { nom: true } } } } },
  })
  return {
    id: e.id,
    statut: e.statut,
    livre: { id: e.exemplaire.livre.id, titre: e.exemplaire.livre.titre, auteur: e.exemplaire.livre.auteur },
    exemplaire: {
      id: e.exemplaire.id,
      codeBarre: e.exemplaire.codeBarre,
      centreId: e.exemplaire.centreId,
      centreNom: e.exemplaire.centre.nom,
      rayon: e.exemplaire.rayon,
      etagere: e.exemplaire.etagere,
      position: e.exemplaire.position,
    },
    initieA: e.initieA.toISOString(),
    confirmeA: e.confirmeA?.toISOString() ?? null,
    dateRetourPrevue: e.dateRetourPrevue?.toISOString() ?? null,
    renduA: e.renduA?.toISOString() ?? null,
    confirmePar: e.confirmePar ?? null,
    // Non résolu ici (usage initiation/confirmation/retour) — voir getEmpruntsCentre.
    emprunteur: null,
  }
}

/**
 * Initie un emprunt en ligne (web/Yaye). L'exemplaire passe `reserve` ; l'emprunt
 * reste `initie` jusqu'au scan badge au centre. Transaction Serializable pour éviter
 * que deux usagers réservent le même exemplaire.
 */
export async function initierEmprunt(input: { cjsUid: string; exemplaireId: string }): Promise<EmpruntVue> {
  const empruntId = await prisma.$transaction(
    async (tx) => {
      const exemplaire = await tx.exemplaire.findUnique({ where: { id: input.exemplaireId } })
      if (!exemplaire) throw new BiblioDomainError('EXEMPLAIRE_NOT_FOUND')
      if (exemplaire.statut !== 'disponible') throw new BiblioDomainError('EXEMPLAIRE_INDISPONIBLE')

      // Anti-doublon : pas deux emprunts actifs du même usager sur le même exemplaire.
      const doublon = await tx.emprunt.findFirst({
        where: { cjsUid: input.cjsUid, exemplaireId: input.exemplaireId, statut: { in: ACTIVE_STATUTS } },
      })
      if (doublon) throw new BiblioDomainError('DOUBLON_EMPRUNT')

      const created = await tx.emprunt.create({
        data: { cjsUid: input.cjsUid, exemplaireId: input.exemplaireId, statut: 'initie' },
      })
      await tx.exemplaire.update({ where: { id: input.exemplaireId }, data: { statut: 'reserve' } })
      return created.id
    },
    { isolationLevel: 'Serializable' },
  )
  syncExemplaireGraph(input.exemplaireId)
  return toEmpruntVue(empruntId)
}

/**
 * Confirme un emprunt au centre (scan badge par le bibliothécaire). `initie` → `en_cours`,
 * exemplaire `reserve` → `emprunte`, date de retour prévue fixée. RBAC : le staff ne peut
 * confirmer que des exemplaires de SON centre.
 */
export async function confirmerEmprunt(input: {
  empruntId: string
  /** Centre du staff (RBAC). `null` = admin cross-centres (aucune restriction). */
  staffCentreId: string | null
  staffCjsUid?: string | null
  now?: Date
}): Promise<EmpruntVue> {
  const now = input.now ?? new Date()
  const exemplaireId = await prisma.$transaction(async (tx) => {
    const emprunt = await tx.emprunt.findUnique({
      where: { id: input.empruntId },
      include: { exemplaire: true },
    })
    if (!emprunt) throw new BiblioDomainError('EMPRUNT_NOT_FOUND')
    if (input.staffCentreId && emprunt.exemplaire.centreId !== input.staffCentreId) {
      throw new BiblioDomainError('CENTRE_INTERDIT')
    }
    if (emprunt.statut === 'en_cours') throw new BiblioDomainError('EMPRUNT_DEJA_CONFIRME')
    if (emprunt.statut !== 'initie') throw new BiblioDomainError('EMPRUNT_NON_CONFIRMABLE')

    const dateRetour = new Date(now)
    dateRetour.setDate(dateRetour.getDate() + DUREE_EMPRUNT_JOURS)

    await tx.emprunt.update({
      where: { id: input.empruntId },
      data: {
        statut: 'en_cours',
        confirmeA: now,
        confirmePar: input.staffCjsUid ?? null,
        dateRetourPrevue: dateRetour,
      },
    })
    await tx.exemplaire.update({ where: { id: emprunt.exemplaireId }, data: { statut: 'emprunte' } })
    return emprunt.exemplaireId
  })
  syncExemplaireGraph(exemplaireId)
  return toEmpruntVue(input.empruntId)
}

/**
 * Enregistre le retour d'un exemplaire (scan retour). `en_cours`/`en_retard` → `rendu`,
 * exemplaire → `disponible`. RBAC : staff de son centre uniquement.
 */
export async function retournerEmprunt(input: {
  empruntId: string
  /** Centre du staff (RBAC). `null` = admin cross-centres (aucune restriction). */
  staffCentreId: string | null
  now?: Date
}): Promise<EmpruntVue> {
  const now = input.now ?? new Date()
  const exemplaireId = await prisma.$transaction(async (tx) => {
    const emprunt = await tx.emprunt.findUnique({
      where: { id: input.empruntId },
      include: { exemplaire: true },
    })
    if (!emprunt) throw new BiblioDomainError('EMPRUNT_NOT_FOUND')
    if (input.staffCentreId && emprunt.exemplaire.centreId !== input.staffCentreId) {
      throw new BiblioDomainError('CENTRE_INTERDIT')
    }
    if (emprunt.statut === 'rendu') throw new BiblioDomainError('EMPRUNT_DEJA_RENDU')

    await tx.emprunt.update({ where: { id: input.empruntId }, data: { statut: 'rendu', renduA: now } })
    await tx.exemplaire.update({ where: { id: emprunt.exemplaireId }, data: { statut: 'disponible' } })
    return emprunt.exemplaireId
  })
  syncExemplaireGraph(exemplaireId)
  return toEmpruntVue(input.empruntId)
}

// ── Gestion catalogue (CRUD bibliothécaire, GUIC-344) ─────────────────────────

export interface LivreInput {
  titre: string
  auteur: string
  isbn?: string | null
  theme: string
  niveau?: string | null
  langue?: string
  resume?: string | null
  couvertureUrl?: string | null
}

export interface ExemplaireInput {
  livreId: string
  centreId: string
  codeBarre: string
  rayon: string
  etagere: string
  position: string
}

/** Crée un livre au catalogue. */
export async function createLivre(input: LivreInput): Promise<{ id: string }> {
  const livre = await prisma.livre.create({
    data: {
      titre: input.titre,
      auteur: input.auteur,
      isbn: input.isbn ?? null,
      theme: input.theme,
      niveau: input.niveau ?? null,
      langue: input.langue ?? 'fr',
      resume: input.resume ?? null,
      couvertureUrl: input.couvertureUrl ?? null,
    },
  })
  syncLivreGraph(livre.id)
  return { id: livre.id }
}

/** Met à jour un livre. */
export async function updateLivre(id: string, input: Partial<LivreInput>): Promise<void> {
  const exists = await prisma.livre.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new BiblioDomainError('LIVRE_NOT_FOUND')
  await prisma.livre.update({
    where: { id },
    data: {
      titre: input.titre,
      auteur: input.auteur,
      isbn: input.isbn,
      theme: input.theme,
      niveau: input.niveau,
      langue: input.langue,
      resume: input.resume,
      couvertureUrl: input.couvertureUrl,
    },
  })
  syncLivreGraph(id)
}

/** Supprime un livre (et ses exemplaires en cascade). */
export async function deleteLivre(id: string): Promise<void> {
  const exists = await prisma.livre.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new BiblioDomainError('LIVRE_NOT_FOUND')
  await prisma.livre.delete({ where: { id } })
}

/** Ajoute un exemplaire physique à un livre, dans le centre du bibliothécaire. */
export async function createExemplaire(input: ExemplaireInput): Promise<{ id: string }> {
  const livre = await prisma.livre.findUnique({ where: { id: input.livreId }, select: { id: true } })
  if (!livre) throw new BiblioDomainError('LIVRE_NOT_FOUND')
  const ex = await prisma.exemplaire.create({
    data: {
      livreId: input.livreId,
      centreId: input.centreId,
      codeBarre: input.codeBarre,
      rayon: input.rayon,
      etagere: input.etagere,
      position: input.position,
      statut: 'disponible',
    },
  })
  syncExemplaireGraph(ex.id)
  return { id: ex.id }
}

/** Met à jour l'emplacement / le statut d'un exemplaire (RBAC : son centre). */
export async function updateExemplaire(
  id: string,
  /** Centre du staff (RBAC). `null` = admin cross-centres (aucune restriction). */
  staffCentreId: string | null,
  input: Partial<Pick<ExemplaireInput, 'rayon' | 'etagere' | 'position'>> & { statut?: 'disponible' | 'indisponible' },
): Promise<void> {
  const ex = await prisma.exemplaire.findUnique({ where: { id }, select: { centreId: true } })
  if (!ex) throw new BiblioDomainError('EXEMPLAIRE_NOT_FOUND')
  if (staffCentreId && ex.centreId !== staffCentreId) throw new BiblioDomainError('CENTRE_INTERDIT')
  await prisma.exemplaire.update({
    where: { id },
    data: { rayon: input.rayon, etagere: input.etagere, position: input.position, statut: input.statut },
  })
  syncExemplaireGraph(id)
}

/** Supprime un exemplaire (RBAC : son centre ; `null` = admin cross-centres). */
export async function deleteExemplaire(id: string, staffCentreId: string | null): Promise<void> {
  const ex = await prisma.exemplaire.findUnique({ where: { id }, select: { centreId: true } })
  if (!ex) throw new BiblioDomainError('EXEMPLAIRE_NOT_FOUND')
  if (staffCentreId && ex.centreId !== staffCentreId) throw new BiblioDomainError('CENTRE_INTERDIT')
  await prisma.exemplaire.delete({ where: { id } })
  void import('@/lib/ia/graph/projection/project')
    .then((m) => m.syncExemplaireDeletion(id))
    .catch((err) => logger.warn('[biblio] suppression graphe exemplaire échouée (fail-soft)', { id, err: String(err) }))
}

/** Emprunts d'un centre filtrés par statut (file de traitement bibliothécaire). */
export async function getEmpruntsCentre(centreId: string, statuts: StatutEmprunt[]): Promise<EmpruntVue[]> {
  const emprunts = await prisma.emprunt.findMany({
    where: { exemplaire: { centreId }, statut: { in: statuts } },
    orderBy: { initieA: 'desc' },
    include: { exemplaire: { include: { livre: true, centre: { select: { nom: true } } } } },
    take: 200,
  })
  return emprunts.map((e) => ({
    id: e.id,
    statut: e.statut,
    livre: { id: e.exemplaire.livre.id, titre: e.exemplaire.livre.titre, auteur: e.exemplaire.livre.auteur },
    exemplaire: {
      id: e.exemplaire.id,
      codeBarre: e.exemplaire.codeBarre,
      centreId: e.exemplaire.centreId,
      centreNom: e.exemplaire.centre.nom,
      rayon: e.exemplaire.rayon,
      etagere: e.exemplaire.etagere,
      position: e.exemplaire.position,
    },
    initieA: e.initieA.toISOString(),
    confirmeA: e.confirmeA?.toISOString() ?? null,
    dateRetourPrevue: e.dateRetourPrevue?.toISOString() ?? null,
    renduA: e.renduA?.toISOString() ?? null,
    confirmePar: e.confirmePar ?? null,
    // Résolu par getEmpruntsCentre (supervision admin/staff) — voir GUIC-522 F-09.
    emprunteur: null,
  }))
}

/** Emprunts en cours (et initiés / en retard) d'un bénéficiaire + dates de retour. */
export async function getEmpruntsActifs(cjsUid: string): Promise<EmpruntVue[]> {
  const emprunts = await prisma.emprunt.findMany({
    where: { cjsUid, statut: { in: ACTIVE_STATUTS } },
    orderBy: { initieA: 'desc' },
    include: { exemplaire: { include: { livre: true, centre: { select: { nom: true } } } } },
  })
  return emprunts.map((e) => ({
    id: e.id,
    statut: e.statut,
    livre: { id: e.exemplaire.livre.id, titre: e.exemplaire.livre.titre, auteur: e.exemplaire.livre.auteur },
    exemplaire: {
      id: e.exemplaire.id,
      codeBarre: e.exemplaire.codeBarre,
      centreId: e.exemplaire.centreId,
      centreNom: e.exemplaire.centre.nom,
      rayon: e.exemplaire.rayon,
      etagere: e.exemplaire.etagere,
      position: e.exemplaire.position,
    },
    initieA: e.initieA.toISOString(),
    confirmeA: e.confirmeA?.toISOString() ?? null,
    dateRetourPrevue: e.dateRetourPrevue?.toISOString() ?? null,
    renduA: e.renduA?.toISOString() ?? null,
    confirmePar: e.confirmePar ?? null,
    // Le bénéficiaire consulte ses propres emprunts — pas besoin de résoudre son identité.
    emprunteur: null,
  }))
}
