import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { computeRollups, type RollupFilters } from '@/lib/ia/metrics/rollups'
import { computeFeedbackKpis } from '@/lib/ia/metrics/feedback'
import { computeOutcomes } from '@/lib/ia/metrics/outcomes'
import { computeYqsGlobal } from '@/lib/ia/metrics/yqs'
import { YayeMetricsClient } from './yaye-metrics-client'
import type { CanalAgent } from '@prisma/client'

// Dashboard métriques conversationnelles Yaye — GUIC-435 jalon A (couches 1-2).
// Convention : sous /admin/analytics/ (comme analytics/centres). RBAC admin.

export const metadata: Metadata = { title: 'Métriques Yaye — Admin CJS' }

interface SP {
  from?: string
  to?: string
  canal?: string
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
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const sp = await searchParams
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 86400_000)
  const filters: RollupFilters = {
    from: parseDate(sp.from, defaultFrom),
    to: parseDate(sp.to, now),
    canal: parseCanal(sp.canal),
  }

  const [rollups, feedback, outcomes, yqs] = await Promise.all([
    computeRollups(filters),
    computeFeedbackKpis({ from: filters.from, to: filters.to, canal: filters.canal }),
    computeOutcomes({ from: filters.from, to: filters.to, canal: filters.canal }),
    computeYqsGlobal(filters),
  ])

  return (
    <YayeMetricsClient
      rollups={rollups}
      feedback={feedback}
      outcomes={outcomes}
      yqs={yqs}
      filtres={{
        from: (filters.from ?? defaultFrom).toISOString().slice(0, 10),
        to: (filters.to ?? now).toISOString().slice(0, 10),
        canal: sp.canal === 'web' || sp.canal === 'whatsapp' ? sp.canal : 'tous',
      }}
    />
  )
}
