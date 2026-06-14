'use client'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  MOCK_NOTIFICATIONS,
  type MockNotification,
  type NotificationCategory,
} from './mock-data'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Filter = 'all' | 'unread' | 'candidature' | 'systeme'

export interface NotificationsPanelProps {
  /** Ouverture contrôlée du drawer. */
  isOpen: boolean
  /** Callback fermeture. */
  onClose: () => void
  /** Liste de notifications. Mock par défaut. */
  notifications?: MockNotification[]
  /** Callback marquer comme lue. */
  onMarkRead?: (id: string) => void
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'candidature', label: 'Candidatures' },
  { value: 'systeme', label: 'Système' },
]

const CATEGORY_ICON: Record<NotificationCategory, 'mail' | 'bell' | 'sparkle' | 'pin'> = {
  candidature: 'mail',
  systeme: 'bell',
  opportunite: 'sparkle',
  centre: 'pin',
}

/**
 * Formate la date en libellé groupe lisible :
 * "Aujourd'hui" / "Hier" / "Cette semaine" / "Plus tôt".
 */
function groupLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const dayMs = 24 * 3600_000
  const diffDays = Math.floor((now.getTime() - d.getTime()) / dayMs)
  if (diffDays < 1) return "Aujourd'hui"
  if (diffDays < 2) return 'Hier'
  if (diffDays < 7) return 'Cette semaine'
  return 'Plus tôt'
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD} j`
}

/**
 * NotificationsPanel — drawer notifications responsive.
 *
 * - Desktop ≥ md : side-panel 400px à droite
 * - Mobile : bottom-sheet hauteur 88vh
 * - Tabs filtre : Toutes / Non lues / Candidatures / Système
 * - Liste groupée par date (Aujourd'hui / Hier / Cette semaine / Plus tôt)
 * - Esc + clic backdrop ferment, focus trap, role="dialog" aria-modal="true"
 *
 * Trigger depuis BenefTopBar (icône cloche) — passer la prop `onBellClick`
 * pour ouvrir.
 */
export function NotificationsPanel({
  isOpen,
  onClose,
  notifications = MOCK_NOTIFICATIONS,
  onMarkRead,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const titleId = useId()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const id = requestAnimationFrame(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      firstFocusable?.focus()
    })
    const restore = returnFocusRef.current
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(id)
      if (restore && document.body.contains(restore)) {
        try {
          restore.focus()
        } catch {
          /* noop */
        }
      }
    }
  }, [isOpen, handleKeyDown])

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true
      if (filter === 'unread') return !n.read
      if (filter === 'candidature') return n.category === 'candidature'
      if (filter === 'systeme') return n.category === 'systeme'
      return true
    })
  }, [notifications, filter])

  const groups = useMemo(() => {
    const acc = new Map<string, MockNotification[]>()
    for (const n of filtered) {
      const key = groupLabel(n.createdAt)
      const list = acc.get(key) ?? []
      list.push(n)
      acc.set(key, list)
    }
    return Array.from(acc.entries())
  }, [filtered])

  const unreadCount = notifications.filter((n) => !n.read).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--gj-z-overlay)' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'var(--gj-overlay)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[400px]
          bg-white shadow-gj-lg flex flex-col rounded-t-gj-2xl md:rounded-none
          max-h-[88vh] md:max-h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gj-line px-space-4 py-space-3 flex-shrink-0">
          <div className="flex items-center gap-space-2">
            <h2 id={titleId} className="text-fs-500 font-black text-color-text-primary">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} non lues`}
                className="inline-flex items-center justify-center text-fs-100 font-bold rounded-gj-pill px-space-2"
                style={{
                  background: 'var(--gj-red)',
                  color: 'var(--gj-surface)',
                  minWidth: 22,
                  height: 20,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les notifications"
            className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center
              text-gj-grey hover:text-gj-ink rounded-gj-pill"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Filtres */}
        <div
          role="tablist"
          aria-label="Filtrer les notifications"
          className="flex flex-wrap gap-space-1 border-b border-gj-line px-space-3 py-space-2 flex-shrink-0"
        >
          {FILTERS.map((f) => {
            const active = filter === f.value
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.value)}
                className="px-space-3 py-space-1 text-fs-200 font-bold rounded-gj-pill whitespace-nowrap transition-colors"
                style={{
                  background: active ? 'var(--gj-teal-deep)' : 'transparent',
                  color: active ? 'var(--gj-surface)' : 'var(--gj-grey)',
                  border: active ? 0 : '1.5px solid var(--gj-line)',
                  cursor: 'pointer',
                  minHeight: 32,
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Liste groupée */}
        <div className="overflow-y-auto flex-1">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-space-6 px-space-4 text-center">
              <Icon name="bell" size={28} style={{ color: 'var(--gj-grey-2)' }} />
              <p className="mt-space-2 text-fs-300 text-gj-grey">Aucune notification.</p>
            </div>
          ) : (
            groups.map(([label, items]) => (
              <section key={label} className="py-space-2">
                <h3 className="text-fs-100 font-black text-gj-grey uppercase tracking-wide px-space-4 pb-space-1">
                  {label}
                </h3>
                <ul className="flex flex-col">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => onMarkRead?.(n.id)}
                        className="w-full flex items-start gap-space-3 px-space-4 py-space-3 text-left hover:bg-gj-bg transition-colors"
                        style={{
                          background: n.read ? 'transparent' : 'var(--gj-teal-soft, #E6F4F1)',
                          borderBottom: '1px solid var(--gj-line)',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          aria-hidden
                          className="inline-flex items-center justify-center rounded-gj-pill flex-shrink-0"
                          style={{
                            width: 36,
                            height: 36,
                            background: 'var(--gj-surface)',
                            border: '1.5px solid var(--gj-line)',
                            color: 'var(--gj-teal-deep)',
                          }}
                        >
                          <Icon name={CATEGORY_ICON[n.category]} size={18} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-space-2">
                            <span className="text-fs-300 font-bold text-color-text-primary truncate">
                              {n.title}
                            </span>
                            {!n.read && (
                              <span
                                aria-label="Non lue"
                                className="inline-block rounded-full flex-shrink-0"
                                style={{ width: 8, height: 8, background: 'var(--gj-red)' }}
                              />
                            )}
                          </span>
                          <span className="block text-fs-200 text-gj-grey mt-1 line-clamp-2">
                            {n.body}
                          </span>
                          <span className="block text-fs-100 text-gj-grey-2 mt-1">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
