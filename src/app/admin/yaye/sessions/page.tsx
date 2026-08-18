import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listSessions, sessionsSummary, type SessionListFilters } from '@/lib/ia/admin/sessions'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import { SessionsClient } from './SessionsClient'
import type { CanalAgent } from '@prisma/client'

// Panel admin — Suivi des sessions Yaye (Lot 7, GUIC-259).
// Lecture seule sur agent_logs. RBAC admin. Convention de design : voir admin/candidatures.

export const metadata: Metadata = { title: 'Sessions Yaye — Admin CJS' }

const PAGE_SIZE = 20

interface SP {
  page?: string
  from?: string
  to?: string
  canal?: string
  q?: string
  filtre?: string // '' | 'erreur' | 'escalade'
  role?: string
  centre?: string
}

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function parseCanal(v: string | undefined): CanalAgent | undefined {
  return v === 'web' || v === 'whatsapp' ? v : undefined
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !canManageYaye(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 86_400_000)

  const role = (sp.role ?? '').trim() || undefined
  const centre = (sp.centre ?? '').trim() || undefined

  const filters: SessionListFilters = {
    from: parseDate(sp.from, defaultFrom),
    to: parseDate(sp.to, now),
    canal: parseCanal(sp.canal),
    q: (sp.q ?? '').trim() || undefined,
    role,
    centreId: centre,
    erreurOnly: sp.filtre === 'erreur',
    escaladeOnly: sp.filtre === 'escalade',
    drapeauOnly: sp.filtre === 'drapeau',
  }

  const [{ rows, total }, summary, centres, roleRows] = await Promise.all([
    listSessions(filters, page, PAGE_SIZE),
    sessionsSummary(filters),
    // Options des filtres — centres actifs + rôles réellement présents dans les logs.
    prisma.centre.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
    prisma.agentLog.findMany({
      where: { role: { not: null } },
      select: { role: true },
      distinct: ['role'],
      orderBy: { role: 'asc' },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const roles = roleRows.map((r) => r.role).filter((r): r is string => !!r)

  return (
    <SessionsClient
      rows={rows.map((r) => ({ ...r, debut: r.debut.toISOString() }))}
      summary={summary}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      centres={centres}
      roles={roles}
      filtres={{
        from: filters.from.toISOString().slice(0, 10),
        to: filters.to.toISOString().slice(0, 10),
        canal: sp.canal === 'web' || sp.canal === 'whatsapp' ? sp.canal : 'tous',
        q: filters.q ?? '',
        filtre: sp.filtre === 'erreur' || sp.filtre === 'escalade' || sp.filtre === 'drapeau' ? sp.filtre : '',
        role: role ?? '',
        centre: centre ?? '',
      }}
    />
  )
}
