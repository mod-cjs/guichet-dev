import { prisma } from '@/lib/prisma'
import { timeAgo } from '@/lib/time-ago'

// GUIC-247 — Loader du centre de notifications (page /jeune/notifications).
// Charge toutes les notifs récentes (≤ 90 j ou 200 dernières — borne soft) et
// les groupe par jour pour l'affichage. Le filtre par type est appliqué côté
// client (les notifications restent au format DTO complet).

export type TypeNotificationValue =
  | 'Deadline'
  | 'Candidature'
  | 'Message'
  | 'Yaye'
  | 'System'

export interface NotificationItem {
  id: string
  type: TypeNotificationValue
  titre: string
  contenu: string
  iconName: string | null
  lien: string | null
  metaPill: string | null
  lu: boolean
  createdAt: string
  /** Étiquette FR : « il y a 2 min », « hier · 14:32 », etc. */
  ageRelatif: string
}

export interface NotificationsGroupedByDay {
  jour: string
  items: NotificationItem[]
}

export interface LoadNotificationsResult {
  groupes: NotificationsGroupedByDay[]
  unreadCount: number
}

/** Plafond de notifs chargées (volume raisonnable pour mobile). */
const MAX_NOTIFS = 200

/** Compte des notifications non lues — utilisé par le badge cloche (topbar). */
export async function countUnreadNotifications(cjsUid: string): Promise<number> {
  return prisma.notification.count({ where: { cjsUid, luA: null } })
}

/** Calcule l'étiquette d'âge pour une date donnée. */
export function ageRelatifLabel(date: Date, now: Date = new Date()): string {
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (isYesterday) {
    return `hier · ${formatHM(date)}`
  }
  if (sameDay) {
    // < 24h, même jour : “il y a X min/h”
    return timeAgo(date.toISOString(), now)
  }
  // > hier : libellé court “lun. 14:11”
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'short' })
  return `${jour} ${formatHM(date)}`
}

function formatHM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Détermine la clé de groupement (jour) pour une notification. */
export function groupeJourLabel(date: Date, now: Date = new Date()): string {
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return "Aujourd'hui"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) return 'Hier'

  const diffMs = now.getTime() - date.getTime()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  if (diffMs <= sevenDaysMs) return 'Cette semaine'
  return 'Plus ancien'
}

/**
 * Charge les notifications d'un utilisateur, triées du plus récent au plus
 * ancien, regroupées par jour, avec le compteur de non-lues.
 */
export async function loadNotifications(
  cjsUid: string,
  now: Date = new Date(),
): Promise<LoadNotificationsResult> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { cjsUid },
      orderBy: { createdAt: 'desc' },
      take: MAX_NOTIFS,
      select: {
        id: true,
        type: true,
        titre: true,
        contenu: true,
        iconName: true,
        lien: true,
        metaPill: true,
        luA: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { cjsUid, luA: null } }),
  ])

  const items: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type as TypeNotificationValue,
    titre: r.titre,
    contenu: r.contenu,
    iconName: r.iconName,
    lien: r.lien,
    metaPill: r.metaPill,
    lu: r.luA !== null,
    createdAt: r.createdAt.toISOString(),
    ageRelatif: ageRelatifLabel(r.createdAt, now),
  }))

  // Groupement par jour, ordre conservé (le findMany est déjà desc).
  const ORDER = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien']
  const buckets = new Map<string, NotificationItem[]>()
  for (const item of items) {
    const jour = groupeJourLabel(new Date(item.createdAt), now)
    if (!buckets.has(jour)) buckets.set(jour, [])
    buckets.get(jour)!.push(item)
  }

  const groupes: NotificationsGroupedByDay[] = ORDER.filter((j) =>
    buckets.has(j),
  ).map((jour) => ({ jour, items: buckets.get(jour)! }))

  return { groupes, unreadCount }
}
