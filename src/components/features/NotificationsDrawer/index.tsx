'use client'

import { useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Icon, type IconName } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import type {
  Notification,
  NotificationsFilter,
  NotificationType,
} from './types'

export type { Notification, NotificationType, NotificationsFilter } from './types'

export interface NotificationsDrawerProps {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  /** Click sur une row → handler optionnel (ex: navigation, marquer lu). */
  onItemClick?: (notif: Notification) => void
  /** Bouton "Tout marquer lu" → handler optionnel. */
  onMarkAllRead?: () => void
}

interface TabConfig {
  id: NotificationsFilter
  label: string
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'deadline', label: 'Deadlines' },
  { id: 'candidature', label: 'Candidatures' },
  { id: 'message', label: 'Messages' },
  { id: 'yaye', label: 'Yaye' },
]

const TYPE_META: Record<
  NotificationType,
  { icon: IconName; bg: string; fg: string }
> = {
  deadline: { icon: 'clock', bg: 'var(--gj-red-soft, #FDECEC)', fg: 'var(--gj-red)' },
  candidature: { icon: 'check-circle', bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
  message: { icon: 'chat', bg: 'var(--gj-yellow-soft, #FFF5D1)', fg: 'var(--gj-ink)' },
  yaye: { icon: 'sparkle', bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
}

type GroupKey = 'today' | 'yesterday' | 'week' | 'older'

const GROUP_LABEL: Record<GroupKey, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  week: 'Cette semaine',
  older: 'Plus ancien',
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function groupKey(ts: string, nowMs = Date.now()): GroupKey {
  const t = new Date(ts).getTime()
  const today = startOfDay(new Date(nowMs))
  const dayMs = 24 * 60 * 60 * 1000
  if (t >= today) return 'today'
  if (t >= today - dayMs) return 'yesterday'
  if (t >= today - 7 * dayMs) return 'week'
  return 'older'
}

function formatRelative(ts: string, nowMs = Date.now()): string {
  const diffMin = Math.max(1, Math.round((nowMs - new Date(ts).getTime()) / 60000))
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `il y a ${diffD} j`
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/**
 * Drawer notifications mobile (GUIC-194 · Phase 2B-8).
 *
 * Bottom-sheet (Sheet variant='bottom') avec :
 * - Header titre + bouton "Tout marquer lu"
 * - Onglets de filtre Toutes / Deadlines / Candidatures / Messages / Yaye
 * - Liste groupée par date (Aujourd'hui / Hier / Cette semaine / Plus ancien)
 * - Empty state si filtre sans résultat
 */
export function NotificationsDrawer({
  open,
  onClose,
  notifications,
  onItemClick,
  onMarkAllRead,
}: NotificationsDrawerProps) {
  const [filter, setFilter] = useState<NotificationsFilter>('all')

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? notifications
        : notifications.filter(n => n.type === filter),
    [notifications, filter],
  )

  const grouped = useMemo(() => {
    const groups: Record<GroupKey, Notification[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    }
    for (const n of filtered) groups[groupKey(n.timestamp)].push(n)
    return groups
  }, [filtered])

  const hasAny = filtered.length > 0

  return (
    <Sheet isOpen={open} onClose={onClose} variant="bottom">
      {/* Header custom (on n'utilise pas `title` du Sheet pour pouvoir ajouter
          le bouton "Tout marquer lu" à droite). */}
      <div className="flex items-center justify-between pb-space-3 border-b border-gj-line -mt-space-1">
        <h2 className="text-fs-500 font-black text-color-text-primary m-0">Notifications</h2>
        <div className="flex items-center gap-2">
          {onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-fs-200 text-gj-teal-deep font-bold bg-transparent border-0 cursor-pointer hover:underline"
            >
              Tout marquer lu
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] inline-flex items-center justify-center text-gj-grey hover:text-gj-ink rounded-gj-pill"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      {/* Onglets filtre */}
      <div
        role="tablist"
        aria-label="Filtrer les notifications"
        className="flex gap-2 py-space-3 flex-wrap"
      >
        {TABS.map(tab => {
          const isActive = filter === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center px-space-3 py-1.5 text-fs-200 font-bold rounded-gj-pill border-[1.5px] cursor-pointer min-h-[36px] ${
                isActive
                  ? 'bg-gj-teal-deep text-white border-gj-teal-deep'
                  : 'bg-white text-gj-teal-deep border-gj-line hover:bg-gj-teal-soft'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Liste groupée ou empty state */}
      {hasAny ? (
        <div className="flex flex-col gap-space-3 pb-space-3">
          {(Object.keys(grouped) as GroupKey[]).map(key => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <section key={key} aria-label={GROUP_LABEL[key]}>
                <h3 className="text-fs-100 font-black uppercase tracking-wide text-gj-grey px-space-1 mb-space-1">
                  {GROUP_LABEL[key]}
                </h3>
                <ul className="flex flex-col gap-1 list-none m-0 p-0">
                  {items.map(n => (
                    <NotificationRow key={n.id} notif={n} onClick={onItemClick} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="py-space-5">
          <EmptyState
            title="Pas de nouvelles pour le moment"
            description="Reviens un peu plus tard, Yaye veille pour toi."
          />
        </div>
      )}
    </Sheet>
  )
}

function NotificationRow({
  notif,
  onClick,
}: {
  notif: Notification
  onClick?: (n: Notification) => void
}) {
  const meta = TYPE_META[notif.type]
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick?.(notif)}
        aria-label={`${notif.titre} — ${notif.unread ? 'non lu' : 'lu'}`}
        className={`w-full flex items-start gap-space-3 px-space-2 py-space-2 rounded-gj-md border-0 text-left cursor-pointer hover:bg-gj-bg ${
          notif.unread ? 'bg-gj-teal-soft/30' : 'bg-transparent'
        }`}
      >
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: meta.bg,
            color: meta.fg,
          }}
        >
          <Icon name={meta.icon} size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-fs-300 truncate ${
                notif.unread ? 'font-black text-color-text-primary' : 'font-bold text-gj-ink'
              }`}
            >
              {notif.titre}
            </span>
            {notif.unread && (
              <span
                aria-hidden="true"
                className="flex-shrink-0"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: 'var(--gj-red)',
                }}
              />
            )}
          </div>
          <p className="text-fs-200 text-gj-grey m-0 line-clamp-2">{notif.preview}</p>
          <p className="text-fs-100 text-gj-grey m-0 mt-0.5">{formatRelative(notif.timestamp)}</p>
        </div>
      </button>
    </li>
  )
}
