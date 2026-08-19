import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { computeRollups, type RollupFilters } from '@/lib/ia/metrics/rollups'
import { computeFeedbackKpis } from '@/lib/ia/metrics/feedback'
import { computeOutcomes } from '@/lib/ia/metrics/outcomes'
import { computeYqsGlobal } from '@/lib/ia/metrics/yqs'
import { peekRegression } from '@/lib/ia/metrics/regression-data'
import { computeCalibration } from '@/lib/ia/metrics/calibration-data'
import { computeTopIntentions } from '@/lib/ia/metrics/intentions'
import { computeIntentionsEnEchec } from '@/lib/ia/metrics/intentions-echec'
import { computeEvalCoverage } from '@/lib/ia/metrics/eval-coverage'
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

  const [rollups, feedback, outcomes, yqs, regression, calibration, topIntentions, intentionsEnEchec, evalCoverage] = await Promise.all([
    computeRollups(filters),
    computeFeedbackKpis({ from: filters.from, to: filters.to, canal: filters.canal }),
    computeOutcomes({ from: filters.from, to: filters.to, canal: filters.canal }),
    computeYqsGlobal(filters),
    peekRegression(filters),
    computeCalibration(),
    computeTopIntentions({ from: filters.from, to: filters.to }),
    computeIntentionsEnEchec({ since: filters.from, minVolume: 5 }),
    computeEvalCoverage({ since: filters.from }),
  ])

  return (
    <YayeMetricsClient
      rollups={rollups}
      feedback={feedback}
      outcomes={outcomes}
      yqs={yqs}
      regression={regression}
      calibration={calibration}
      topIntentions={topIntentions}
      intentionsEnEchec={intentionsEnEchec}
      evalCoverage={evalCoverage}
      filtres={{
        from: (filters.from ?? defaultFrom).toISOString().slice(0, 10),
        to: (filters.to ?? now).toISOString().slice(0, 10),
        canal: sp.canal === 'web' || sp.canal === 'whatsapp' ? sp.canal : 'tous',
      }}
    />
  )
}
