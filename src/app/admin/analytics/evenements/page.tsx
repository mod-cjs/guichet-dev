import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { getEvenementsAnalytics, type EvenementsAnalyticsFilters } from '@/lib/loaders/evenements-analytics'
import { EvenementsAnalyticsClient } from './evenements-analytics-client'

export const metadata: Metadata = { title: 'Analytics Événements — Admin CJS' }

interface SP {
  from?: string
  to?: string
  centreId?: string | string[]
}

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function parseCentreIds(v: string | string[] | undefined): string[] | undefined {
  if (!v) return undefined
  const arr = Array.isArray(v) ? v : v.split(',').filter(Boolean)
  return arr.length > 0 ? arr : undefined
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 90 * 86400_000)
  const filters: EvenementsAnalyticsFilters = {
    from: parseDate(sp.from, defaultFrom),
    to: parseDate(sp.to, now),
    centreIds: parseCentreIds(sp.centreId),
  }

  const [analytics, centres] = await Promise.all([
    getEvenementsAnalytics(filters),
    prisma.centre.findMany({
      where: { estActif: true },
      select: { id: true, nom: true },
      orderBy: [{ region: 'asc' }, { nom: 'asc' }],
    }),
  ])

  return (
    <EvenementsAnalyticsClient
      analytics={analytics}
      centres={centres}
      filtres={{
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        centreIds: filters.centreIds ?? [],
      }}
    />
  )
}
