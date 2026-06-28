// Escalade Yaye → opérateur humain (Lot 6, GUIC-259).
// Spec : .agent_context/specs/yaye/06-agent-logs-tracabilite.md (event `escalade_conseiller`)
//
// Deux écritures complémentaires, au moment exact où Yaye passe la main :
//   1. TRACE événementielle dans `agent_logs` (type `escalade_conseiller`) — append-only,
//      consommée par les métriques (taux d'escalade) et le détail technique du panel admin.
//   2. ÉTAT de traitement dans `escalades_yaye` — la file mutable que le staff traite.
//
// ⚠️ Invariant : FAIL-SOFT — une erreur d'écriture ne doit jamais interrompre la
// conversation. On log un warning et on continue (cf. agent-logs.ts).
// ⚠️ Anti-doublon : une session déjà escaladée et non résolue ne recrée pas de ligne
// de file (mais la trace event reste écrite à chaque fois pour la fidélité du transcript).

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { logAgentEvent } from './agent-logs'
import type { CanalAgent } from '@prisma/client'

/** Rôles AgentCentre notifiés à chaque escalade (décision produit GUIC-259, Lot 6). */
const ADVISOR_ROLES = ['conseiller', 'directeur'] as const
/** Plafond de destinataires par escalade (garde-fou volume de notifications). */
const MAX_RECIPIENTS = 200

/**
 * Notifie le staff (conseillers + directeurs) d'une nouvelle escalade via le système
 * de Notification EXISTANT (type `Yaye`). Dédupliqué, plafonné, FAIL-SOFT : un échec
 * ici ne remonte pas (l'escalade est déjà journalisée et en file). Pas de remise par
 * centre : volume staff réduit, on informe tout le pool conseiller (décision produit).
 */
async function notifyAdvisorsOfEscalade(input: RecordEscaladeInput): Promise<void> {
  try {
    const staff = await prisma.agentCentre.findMany({
      where: { role: { in: [...ADVISOR_ROLES] } },
      select: { cjsUid: true },
      distinct: ['cjsUid'],
      take: MAX_RECIPIENTS,
    })
    if (staff.length === 0) return

    // Signalement de DANGER → notification distincte, urgente et explicite sur la catégorie.
    const danger = input.dangerSignal
    const titre = danger ? `Signalement de danger Yaye (${danger})` : 'Nouvelle escalade Yaye'
    const contenu = danger
      ? `URGENT — un jeune a signalé une situation de type « ${danger} ». À prendre en charge EN PRIORITÉ dans le panel.`
      : `Une conversation a été transmise à un conseiller${input.raison ? ` (${input.raison})` : ''}. À prendre en charge dans le panel.`

    await prisma.notification.createMany({
      data: staff.map((s) => ({
        cjsUid: s.cjsUid,
        type: 'Yaye' as const,
        titre,
        contenu,
        iconName: 'bell',
        lien: '/admin/yaye/escalades',
        metaPill: danger ? 'Danger' : 'Escalade',
      })),
      // FK Utilisateur : un cjsUid staff non présent ferait échouer le lot — skipDuplicates
      // ne couvre pas la FK, d'où le catch englobant (fail-soft).
      skipDuplicates: true,
    })
  } catch (err) {
    logger.warn('[escalade] notification staff échouée', { session: input.sessionId, err: String(err) })
  }
}

export interface RecordEscaladeInput {
  sessionId: string
  cjsUid?: string | null
  role?: string | null
  centreId?: string | null
  canal: CanalAgent
  /** Pourquoi Yaye escalade (ex. « max_tool_rounds », « sujet sensible »). */
  raison?: string | null
  /** Stade de la conversation au moment de l'escalade (libre, optionnel). */
  stade?: string | null
  /** Catégorie de DANGER repérée (violence, harcelement…) — déclenche un signalement urgent. */
  dangerSignal?: string | null
}

/** Résultat d'une escalade — porte le SUIVI restitué à l'utilisateur. */
export interface EscaladeResult {
  /** Référence humaine stable (`YAYE-XXXXXX`) que la personne peut rappeler. */
  reference: string
  /** Vrai si une escalade non résolue existait déjà pour cette session. */
  alreadyPending: boolean
}

/**
 * Référence d'escalade lisible et STABLE par session (`YAYE-XXXXXX`). Dérivée du
 * sessionId (toujours disponible, même si l'écriture en base échoue) → l'utilisateur
 * a toujours un repère à citer, et la `EscaladeYaye` se retrouve par son `sessionId`.
 */
export function escaladeReference(sessionId: string): string {
  const slug = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
  return `YAYE-${slug || 'CONTACT'}`
}

/**
 * Enregistre une escalade vers un conseiller humain : trace `agent_logs` +
 * ligne dans la file `escalades_yaye` (créée une seule fois par session ouverte).
 * Ne lève jamais. Renvoie le SUIVI (référence + si déjà en file) pour restitution
 * à l'utilisateur.
 */
export async function recordEscalade(input: RecordEscaladeInput): Promise<EscaladeResult> {
  const reference = escaladeReference(input.sessionId)

  // 1. Trace événementielle (toujours, pour le transcript technique + métriques).
  await logAgentEvent({
    sessionId: input.sessionId,
    cjsUid: input.cjsUid ?? null,
    role: input.role ?? null,
    centreId: input.centreId ?? null,
    canal: input.canal,
    typeEvenement: 'escalade_conseiller',
    payload: { raison: input.raison ?? null, stade: input.stade ?? null, reference, dangerSignal: input.dangerSignal ?? null },
  })

  // 2. File de traitement — une seule entrée ouverte par session.
  try {
    const existante = await prisma.escaladeYaye.findFirst({
      where: { sessionId: input.sessionId, statut: { not: 'resolue' } },
      select: { id: true },
    })
    if (existante) return { reference, alreadyPending: true } // déjà en file → pas de doublon

    await prisma.escaladeYaye.create({
      data: {
        sessionId:    input.sessionId,
        cjsUid:       input.cjsUid ?? null,
        role:         input.role ?? null,
        centreId:     input.centreId ?? null,
        canal:        input.canal,
        raison:       input.raison ?? null,
        stade:        input.stade ?? null,
        // Phase 2 : catégorie de danger en colonne dédiée + priorité de file (danger en haut).
        signalDanger: input.dangerSignal ?? null,
        priorite:     input.dangerSignal ? 1 : 0,
      },
    })

    // Remise au staff (notification in-app) — seulement pour une NOUVELLE escalade.
    await notifyAdvisorsOfEscalade(input)
  } catch (err) {
    // Fail-soft : ne jamais casser la conversation pour un échec d'écriture de la file.
    logger.warn('[escalade] écriture file échouée', { session: input.sessionId, err: String(err) })
  }
  return { reference, alreadyPending: false }
}
