import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import {
  getCentresAnalytics,
  type CentresAnalyticsFilters,
} from '@/lib/loaders/centres-analytics'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import { CentresAnalyticsClient } from './centres-analytics-client'

export const metadata: Metadata = { title: 'Analytics Centres — Admin CJS' }

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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 86400_000)
  const filters: CentresAnalyticsFilters = {
    from: parseDate(sp.from, defaultFrom),
    to: parseDate(sp.to, now),
    centreIds: parseCentreIds(sp.centreId),
  }

  const [analytics, centres] = await Promise.all([
    getCentresAnalytics(filters),
    prisma.centre.findMany({
      where: { estActif: true },
      select: { id: true, nom: true },
      orderBy: [{ region: 'asc' }, { nom: 'asc' }],
    }),
  ])

  // Fail-soft tracking : on logue par centre-events helper.
  await trackCentreEvent({
    type: 'admin_analytics_centres_viewed',
    cjsUid: session.cjsUid,
    metadata: {
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
      centresCount: filters.centreIds?.length ?? 0,
    },
  })

  return (
    <CentresAnalyticsClient
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
