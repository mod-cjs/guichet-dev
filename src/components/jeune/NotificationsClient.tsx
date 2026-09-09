'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName, ICON_NAMES } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import type {
  NotificationItem,
  NotificationsGroupedByDay,
  TypeNotificationValue,
} from '@/lib/loaders/notifications'

// GUIC-247 — Centre de notifications côté client.
// Tabs filtrent côté client (DTO chargé serveur), bouton « Tout marquer lu »
// + click sur item → mark as read (POST) puis redirect vers `lien` si défini.

type TabValue = 'Toutes' | TypeNotificationValue

interface Tab {
  value: TabValue
  label: string
}

const TABS: Tab[] = [
  { value: 'Toutes', label: 'Toutes' },
  { value: 'Deadline', label: 'Deadlines' },
  { value: 'Candidature', label: 'Candidatures' },
  { value: 'Message', label: 'Messages' },
  { value: 'Yaye', label: 'Yaye' },
]

/** Palette par type — réutilise les soft tokens existants. */
const TILE_STYLE: Record<TypeNotificationValue, { bg: string; fg: string }> = {
  Candidature: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
  Deadline: { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  Message: { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue)' },
  Yaye: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' }, // override visuel ci-dessous
  System: { bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' },
}

const FALLBACK_ICON: Record<TypeNotificationValue, IconName> = {
  Candidature: 'document',
  Deadline: 'flame',
  Message: 'chat',
  Yaye: 'sparkle',
  System: 'info',
}

function isKnownIcon(name: string | null): name is IconName {
  return !!name && (ICON_NAMES as readonly string[]).includes(name)
}

export interface NotificationsClientProps {
  groupes: NotificationsGroupedByDay[]
  initialUnread: number
}

export function NotificationsClient({
  groupes: initialGroupes,
  initialUnread,
}: NotificationsClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('Toutes')
  const [groupes, setGroupes] = useState(initialGroupes)
  const [unread, setUnread] = useState(initialUnread)
  const [, startTransition] = useTransition()
  const router = useRouter()

  /** Filtre des groupes selon l'onglet (les items vides → groupe omis). */
  const filteredGroupes = useMemo(() => {
    if (activeTab === 'Toutes') return groupes
    return groupes
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.type === activeTab),
      }))
      .filter((g) => g.items.length > 0)
  }, [groupes, activeTab])

  /** Compteurs par tab — basé sur l'état courant. */
  const counts = useMemo(() => {
    const all = groupes.flatMap((g) => g.items)
    return {
      Toutes: all.length,
      Deadline: all.filter((i) => i.type === 'Deadline').length,
      Candidature: all.filter((i) => i.type === 'Candidature').length,
      Message: all.filter((i) => i.type === 'Message').length,
      Yaye: all.filter((i) => i.type === 'Yaye').length,
    } as Record<TabValue, number>
  }, [groupes])

  /** Marque la notif comme lue localement + serveur (best-effort). */
  function markRead(id: string) {
    setGroupes((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((it) => (it.id === id && !it.lu ? { ...it, lu: true } : it)),
      })),
    )
    setUnread((u) => Math.max(0, u - 1))
    startTransition(() => {
      void fetch(`/api/notifications/${id}/lu`, { method: 'POST' }).catch(() => {
        /* best-effort */
      })
    })
  }

  function onItemClick(item: NotificationItem) {
    if (!item.lu) markRead(item.id)
    if (item.lien) {
      router.push(item.lien)
    }
  }

  function markAllRead() {
    const now = new Date().toISOString()
    setGroupes((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((it) => (it.lu ? it : { ...it, lu: true, createdAt: it.createdAt || now })),
      })),
    )
    setUnread(0)
    startTransition(() => {
      void fetch('/api/notifications/lu-all', { method: 'POST' }).catch(() => {
        /* best-effort */
      })
    })
  }

  const empty = filteredGroupes.length === 0

  return (
    <div data-testid="notifications-client">
      <div className="flex items-center justify-between mb-space-3">
        <div
          style={{
            fontSize: 11,
            color: 'var(--gj-grey)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.4px',
          }}
          data-testid="unread-counter"
        >
          {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0}
          aria-label="Tout marquer comme lu"
          style={{
            border: 0,
            background: 'transparent',
            color: unread === 0 ? 'var(--gj-grey-2)' : 'var(--gj-teal-deep)',
            cursor: unread === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: 11,
            padding: 4,
          }}
        >
          Tout marquer lu
        </button>
      </div>

      {/* Tabs — pills */}
      <div
        role="tablist"
        aria-label="Filtrer les notifications"
        className="flex flex-wrap gap-2 mb-space-4"
      >
        {TABS.map((tab) => {
          const active = tab.value === activeTab
          const count = counts[tab.value] ?? 0
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: active ? 'var(--gj-surface)' : 'var(--gj-grey)',
                background: active ? 'var(--gj-teal-deep)' : 'var(--gj-surface)',
                border: `1.5px solid ${active ? 'var(--gj-teal-deep)' : 'var(--gj-line)'}`,
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'inherit',
                minHeight: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.label}
              {count > 0 ? (
                <span
                  style={{
                    background: active ? 'rgba(255,255,255,.2)' : 'var(--gj-bg)',
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontSize: 'var(--fs-100)',
                  }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {empty ? (
        <EmptyState
          emoji="🔔"
          title="Aucune notification"
          description={
            activeTab === 'Toutes'
              ? "Vos prochaines notifications apparaîtront ici dès qu'un événement vous concernera."
              : 'Aucune notification dans cette catégorie pour le moment.'
          }
        />
      ) : (
        <div className="flex flex-col gap-space-4">
          {filteredGroupes.map((g) => (
            <section key={g.jour} aria-label={g.jour}>
              <h2
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--gj-grey)',
                  textTransform: 'uppercase',
                  letterSpacing: '.5px',
                  margin: '0 0 6px',
                }}
              >
                {g.jour}
              </h2>
              <ul
                className="list-none p-0 m-0 flex flex-col"
                style={{
                  background: 'var(--gj-surface)',
                  border: '1px solid var(--gj-line)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {g.items.map((it) => (
                  <li
                    key={it.id}
                    style={{
                      borderBottom: '1px solid var(--gj-line)',
                    }}
                  >
                    <NotifRow item={it} onClick={() => onItemClick(it)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

interface NotifRowProps {
  item: NotificationItem
  onClick: () => void
}

function NotifRow({ item, onClick }: NotifRowProps) {
  const tile = TILE_STYLE[item.type] ?? TILE_STYLE.System
  const iconName: IconName = isKnownIcon(item.iconName)
    ? item.iconName
    : FALLBACK_ICON[item.type]

  const isYaye = item.type === 'Yaye'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${item.titre}${item.lu ? '' : ' (non lue)'}`}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px',
        background: item.lu ? 'var(--gj-surface)' : 'rgba(0,159,118,.04)',
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        border: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {!item.lu ? (
        <span
          aria-hidden
          data-testid="unread-dot"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--gj-red)',
          }}
        />
      ) : null}
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isYaye
            ? 'var(--gj-yaye-gradient)'
            : tile.bg,
          color: isYaye ? 'var(--gj-surface)' : tile.fg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontFamily: isYaye ? 'Georgia, serif' : 'inherit',
          fontWeight: isYaye ? 900 : undefined,
          fontSize: isYaye ? 19 : undefined,
        }}
      >
        {isYaye ? 'Y' : <Icon name={iconName} size={20} />}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            lineHeight: 1.3,
            color: 'var(--gj-ink)',
          }}
        >
          {item.titre}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--gj-grey)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.contenu}
        </span>
        <span
          style={{
            fontSize: 'var(--fs-100)',
            color: 'var(--gj-grey-2)',
            marginTop: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {item.metaPill ? (
            <span
              style={{
                background: tile.bg,
                color: tile.fg,
                padding: '1px 6px',
                borderRadius: 999,
                fontWeight: 800,
              }}
            >
              {item.metaPill}
            </span>
          ) : null}
          <span>{item.ageRelatif}</span>
        </span>
      </span>
    </button>
  )
}
