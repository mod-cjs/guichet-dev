'use server'

/**
 * GUIC-550 — Configuration de la matrice de notifications (admin) + évolution GUIC-547 :
 * modes de déclenchement (auto / validation / différé), file d'attente de validation
 * (occurrence entière), historique des envois.
 * Validation : admin pour tout ; conseiller pour les événements RH (m3/m9) uniquement.
 */
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { isConseillerRole } from '@/lib/auth/espace-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import {
  buildEventMatrix,
  validateChannelSelection,
  type MatrixCell,
  type MatrixMode,
  type MatrixOverride,
} from '@/lib/notifications/matrix'
import { getEventDef, isRhEvent, type NotificationChannelId } from '@/lib/notifications/catalog'
import { validerOccurrence, rejeterOccurrence } from '@/lib/notifications/outbox'
import type { CJSSession } from '@/types/user'
import type { StatutEnvoiNotification } from '@prisma/client'

/** Garde admin — fail-closed. */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

/** Garde valideur : admin (tout) ou conseiller (RH). */
async function assertValideur(): Promise<CJSSession & { adminAccess: boolean }> {
  const session = await getSession()
  if (!session) throw new Error('FORBIDDEN')
  const adminAccess = isAdminRole(session.roles)
  if (!adminAccess && !isConseillerRole(session.roles)) throw new Error('FORBIDDEN')
  return { ...session, adminAccess }
}

/** Charge la matrice complète (catalogue fusionné avec les surcharges DB). */
export async function loadNotificationMatrix(): Promise<MatrixCell[]> {
  await assertAdmin()
  const rows = await prisma.notificationEventConfig.findMany()
  const overrides: MatrixOverride[] = rows.map((r) => ({
    eventKey: r.eventKey,
    role: r.role,
    canaux: (r.canaux as NotificationChannelId[]) ?? [],
    actif: r.actif,
    mode: r.mode as MatrixMode,
    delaiMinutes: r.delaiMinutes,
  }))
  return buildEventMatrix(overrides)
}

const MODES: readonly MatrixMode[] = ['auto', 'validation', 'differe']

/**
 * Définit canaux + mode d'un (événement × rôle). Upsert idempotent + audit.
 * `delaiMinutes` n'a de sens qu'en mode `differe` (défaut 60).
 */
export async function setEventChannels(
  eventKey: string,
  role: string,
  canaux: string[],
  actif: boolean,
  mode: MatrixMode = 'auto',
  delaiMinutes: number | null = null,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const clean = validateChannelSelection(eventKey, role, canaux)
  if (!MODES.includes(mode)) throw new Error(`Mode invalide: ${mode}`)
  const delai = mode === 'differe' ? Math.max(1, Math.trunc(delaiMinutes ?? 60)) : null

  await prisma.notificationEventConfig.upsert({
    where: { eventKey_role: { eventKey, role } },
    create: { eventKey, role, canaux: clean, actif, mode, delaiMinutes: delai, updatedBy: session.cjsUid },
    update: { canaux: clean, actif, mode, delaiMinutes: delai, updatedBy: session.cjsUid },
  })

  await recordAudit(session.cjsUid, 'notif.config', {
    targetType: 'notification_event_config',
    targetId: `${eventKey}:${role}`,
    meta: { canaux: clean, actif, mode, ...(delai ? { delaiMinutes: delai } : {}) },
  })

  revalidatePath('/admin/notifications')
  return { ok: true }
}

// ─── File d'attente de validation ─────────────────────────────────────────────

export interface OccurrenceEnAttente {
  eventId: string
  eventKey: string
  label: string
  titre: string
  contenu: string
  createdAt: string
  /** Nombre de lignes (destinataire × canal) dans l'occurrence. */
  lignes: number
  canaux: string[]
  destinataires: number
  rh: boolean
}

/** Liste les occurrences en attente de validation (conseiller : RH uniquement). */
export async function listEnvoisEnAttente(): Promise<OccurrenceEnAttente[]> {
  const session = await assertValideur()
  const rows = await prisma.notificationEnvoi.findMany({
    where: { statut: 'en_attente_validation' },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const byOccurrence = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byOccurrence.get(row.eventId) ?? []
    list.push(row)
    byOccurrence.set(row.eventId, list)
  }

  const occurrences: OccurrenceEnAttente[] = []
  for (const [eventId, list] of byOccurrence) {
    const first = list[0]
    const rh = isRhEvent(first.eventKey)
    if (!session.adminAccess && !rh) continue // conseiller : périmètre RH seulement
    occurrences.push({
      eventId,
      eventKey: first.eventKey,
      label: getEventDef(first.eventKey)?.label ?? first.eventKey,
      titre: first.titre,
      contenu: first.contenu,
      createdAt: first.createdAt.toISOString(),
      lignes: list.length,
      canaux: [...new Set(list.map((r) => r.canal as string))],
      destinataires: new Set(list.map((r) => r.cjsUid)).size,
      rh,
    })
  }
  return occurrences
}

/** Vérifie que le valideur a le droit sur cette occurrence, puis agit. */
async function withOccurrenceGuard(
  eventId: string,
  action: (valideur: string) => Promise<number>,
): Promise<{ ok: true; lignes: number }> {
  const session = await assertValideur()
  const first = await prisma.notificationEnvoi.findFirst({
    where: { eventId, statut: 'en_attente_validation' },
    select: { eventKey: true },
  })
  if (!first) throw new Error('NOT_FOUND')
  if (!session.adminAccess && !isRhEvent(first.eventKey)) throw new Error('FORBIDDEN')

  const lignes = await action(session.cjsUid)
  revalidatePath('/admin/notifications')
  return { ok: true, lignes }
}

/** Valide une occurrence entière (tous destinataires × canaux). */
export async function validerEnvois(eventId: string): Promise<{ ok: true; lignes: number }> {
  return withOccurrenceGuard(eventId, async (valideur) => {
    const n = await validerOccurrence(eventId, valideur)
    await recordAudit(valideur, 'notif.valider', { targetType: 'notification_envoi', targetId: eventId, meta: { lignes: n } })
    return n
  })
}

/** Rejette une occurrence entière — rien ne part. */
export async function rejeterEnvois(eventId: string): Promise<{ ok: true; lignes: number }> {
  return withOccurrenceGuard(eventId, async (valideur) => {
    const n = await rejeterOccurrence(eventId, valideur)
    await recordAudit(valideur, 'notif.rejeter', { targetType: 'notification_envoi', targetId: eventId, meta: { lignes: n } })
    return n
  })
}

// ─── Historique ───────────────────────────────────────────────────────────────

export interface HistoriqueItem {
  id: string
  eventKey: string
  label: string
  canal: string
  statut: string
  titre: string
  destinataire: string
  erreur: string | null
  envoyeeA: string | null
  createdAt: string
}

export interface HistoriquePage {
  items: HistoriqueItem[]
  total: number
  page: number
  totalPages: number
}

const PAGE_SIZE = 20

/** Historique paginé des envois (20/page), filtrable par statut. */
export async function listHistorique(
  page = 1,
  statut: StatutEnvoiNotification | null = null,
): Promise<HistoriquePage> {
  await assertAdmin()
  const where = statut ? { statut } : {}
  const [rows, total] = await Promise.all([
    prisma.notificationEnvoi.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { utilisateur: { select: { prenom: true, nom: true } } },
    }),
    prisma.notificationEnvoi.count({ where }),
  ])
  return {
    items: rows.map((r) => ({
      id: r.id,
      eventKey: r.eventKey,
      label: getEventDef(r.eventKey)?.label ?? r.eventKey,
      canal: r.canal as string,
      statut: r.statut as string,
      titre: r.titre,
      destinataire: `${r.utilisateur.prenom} ${r.utilisateur.nom}`,
      erreur: r.erreur,
      envoyeeA: r.envoyeeA?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page: Math.max(1, page),
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}
