'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { NotificationsDrawer } from '@/components/features/NotificationsDrawer'
import { MOCK_NOTIFICATIONS } from '@/components/features/NotificationsDrawer/mock-data'
import type { Notification } from '@/components/features/NotificationsDrawer'
import type { CJSSession } from '@/types/user'

interface Props {
  session: CJSSession
}

/**
 * Wrapper client du AppTopbar global (GUIC-194 · Phase 2B-8) :
 * - clic Yaye → navigation `/jeune/yaye`
 * - clic cloche → ouvre le NotificationsDrawer (état local)
 *
 * Les notifications sont mockées (Phase 4 / M8 admin câblera l'API réelle).
 */
export function MobileTopShellClient({ session }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const unread = useMemo(() => notifs.filter(n => n.unread).length, [notifs])

  const markAllRead = () =>
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })))

  const handleItemClick = (n: Notification) =>
    setNotifs(prev => prev.map(x => (x.id === n.id ? { ...x, unread: false } : x)))

  return (
    <>
      <AppTopbar
        session={session}
        unread={unread}
        onYayeClick={() => router.push('/jeune/yaye')}
        onBellClick={() => setOpen(true)}
      />
      <NotificationsDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifs}
        onItemClick={handleItemClick}
        onMarkAllRead={markAllRead}
      />
    </>
  )
}
