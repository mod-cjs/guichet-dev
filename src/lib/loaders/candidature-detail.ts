import { prisma } from '@/lib/prisma'
import type { StatutCandidature, StatutPipeline, ModeEntretien, StatutEntretien } from '@prisma/client'

/**
 * Détail candidature (admin — SUPERVISION, GUIC-692 PR-B). Helpers purs + chargement DB
 * de la fiche slide-over. Lecture seule : l'admin ne décide pas (Retenir/Refuser = recruteur).
 * Garde-fou spike : select ciblé sur opportunite (jamais include plein → TransformError adapter).
 */

export interface Snapshot {
  email: string | null
  telephone: string | null
  niveauEtude: string | null
  situationEmploi: string | null
  competences: string[]
  domainesInteret: string[]
}

/** Extrait les 6 clés du snapshot GUIC-361, robuste à null / valeurs malformées. */
export function parseSnapshot(data: unknown): Snapshot {
  const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return {
    email: str(o.email),
    telephone: str(o.telephone),
    niveauEtude: str(o.niveauEtude),
    situationEmploi: str(o.situationEmploi),
    competences: arr(o.competences),
    domainesInteret: arr(o.domainesInteret),
  }
}

export type AuteurMessage = 'candidat' | 'recruteur' | 'autre'
export function auteurMessage(senderUid: string, candidatUid: string, recruteurUid: string): AuteurMessage {
  if (senderUid === candidatUid) return 'candidat'
  if (senderUid === recruteurUid) return 'recruteur'
  return 'autre'
}

export interface DetailEntretien { id: string; dateLabel: string; mode: ModeEntretien; statut: StatutEntretien; lieu: string | null }
export interface DetailMessage { id: string; auteur: AuteurMessage; corps: string; dateLabel: string }
export interface CandidatureDetail {
  id: string
  candidatPrenom: string
  candidatNom: string
  candidatCjsUid: string
  opportuniteId: string
  opportuniteTitre: string
  recruteur: string
  statut: StatutCandidature
  etape: StatutPipeline
  score: number | null
  scoreRaison: string | null
  soumiseLe: string
  cvUrl: string | null
  lettreMotivation: string | null
  snapshot: Snapshot
  consent: { version: string | null; consentiLe: string | null; ip: string | null; notifications: boolean }
  entretiens: DetailEntretien[]
  conversation: { messages: DetailMessage[] } | null
  relances: DetailRelance[]
}
export interface DetailRelance { id: string; dateLabel: string; destinataire: string; canaux: string[]; message: string | null }

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
function relTime(d: Date, now: Date): string {
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 j'
  if (days < 30) return `il y a ${days} j`
  return dateFmt.format(d)
}

/** Charge la fiche complète d'une candidature (admin). `null` si introuvable. */
export async function getCandidatureDetail(id: string): Promise<CandidatureDetail | null> {
  const c = await prisma.candidature.findUnique({
    where: { id },
    select: {
      id: true, statut: true, pipelineStage: true, scoreAdequation: true, scoreRaison: true, soumiseA: true,
      cvUrl: true, lettreMotivation: true, formulaireData: true,
      cguVersion: true, consentAt: true, consentIp: true, notificationsConsent: true,
      utilisateur: { select: { prenom: true, nom: true, cjsUid: true } },
      opportunite: { select: { id: true, titre: true, organisation: true, organisationLibelle: true, org: { select: { nom: true } }, recruteurUid: true } },
      entretiens: { orderBy: { dateHeure: 'desc' }, select: { id: true, dateHeure: true, mode: true, statut: true, lieu: true } },
      conversation: { select: { candidatUid: true, recruteurUid: true, messages: { orderBy: { createdAt: 'asc' }, select: { id: true, senderUid: true, corps: true, createdAt: true } } } },
      relances: { orderBy: { envoyeeA: 'desc' }, take: 10, select: { id: true, envoyeeA: true, destinataire: true, canaux: true, message: true } },
    },
  })
  if (!c) return null
  const now = new Date()
  return {
    id: c.id,
    candidatPrenom: c.utilisateur.prenom,
    candidatNom: c.utilisateur.nom,
    candidatCjsUid: c.utilisateur.cjsUid,
    opportuniteId: c.opportunite.id,
    opportuniteTitre: c.opportunite.titre,
    recruteur: c.opportunite.org?.nom ?? c.opportunite.organisationLibelle ?? c.opportunite.organisation,
    statut: c.statut,
    etape: c.pipelineStage,
    score: c.scoreAdequation,
    scoreRaison: c.scoreRaison,
    soumiseLe: dateFmt.format(c.soumiseA),
    cvUrl: c.cvUrl,
    lettreMotivation: c.lettreMotivation,
    snapshot: parseSnapshot(c.formulaireData),
    consent: {
      version: c.cguVersion,
      consentiLe: c.consentAt ? dateFmt.format(c.consentAt) : null,
      ip: c.consentIp,
      notifications: c.notificationsConsent,
    },
    entretiens: c.entretiens.map((e) => ({ id: e.id, dateLabel: dateTimeFmt.format(e.dateHeure), mode: e.mode, statut: e.statut, lieu: e.lieu })),
    conversation: c.conversation
      ? { messages: c.conversation.messages.map((m) => ({ id: m.id, auteur: auteurMessage(m.senderUid, c.conversation!.candidatUid, c.conversation!.recruteurUid), corps: m.corps, dateLabel: relTime(m.createdAt, now) })) }
      : null,
    relances: c.relances.map((r) => ({
      id: r.id,
      dateLabel: relTime(r.envoyeeA, now),
      destinataire: String(r.destinataire).replace('_', ' '),
      canaux: Array.isArray(r.canaux) ? (r.canaux as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      message: r.message,
    })),
  }
}
