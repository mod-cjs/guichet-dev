/**
 * GUIC-387 — Layout protégé `/centre-staff/*` (sauf login).
 * Redirige vers `/centre-staff/login` si pas de session staff.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getStaffSession } from '@/lib/auth/staff-session'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function CentreStaffProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession()
  if (!session) redirect('/centre-staff/login')

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-color-border px-space-4 py-space-3 flex items-center justify-between flex-wrap gap-space-2">
        <div className="flex items-center gap-space-3 min-w-0">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gj-teal-soft text-gj-teal-deep">
            <Icon name="user" size={20} title="Staff" />
          </span>
          <div className="min-w-0">
            <p className="text-fs-300 font-bold text-color-text-primary truncate">Staff centre</p>
            <p className="text-fs-200 text-color-text-secondary truncate">{session.email}</p>
          </div>
        </div>
        <nav aria-label="Navigation staff" className="flex items-center gap-space-3 text-fs-300">
          <Link href="/centre-staff" className="text-gj-teal-deep hover:underline min-h-[var(--tap-min)] inline-flex items-center">Accueil</Link>
          <Link href="/centre-staff/reservations" className="text-gj-teal-deep hover:underline min-h-[var(--tap-min)] inline-flex items-center">Réservations</Link>
          <Link href="/centre-staff/checkins" className="text-gj-teal-deep hover:underline min-h-[var(--tap-min)] inline-flex items-center">Check-ins</Link>
          <Link href="/centre-staff/bibliotheque" className="text-gj-teal-deep hover:underline min-h-[var(--tap-min)] inline-flex items-center">Bibliothèque</Link>
        </nav>
      </header>
      <main className="flex-1 p-space-4 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  )
}
