import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { regionLabel } from '@/lib/regions'
import { AdminStatsClient, type AdminStatsData } from './AdminStatsClient'

export const metadata: Metadata = { title: 'Statistiques & rapports — Admin CJS' }

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

/** Construit les bornes des N derniers mois (du plus ancien au plus récent). */
function lastMonths(n: number): { label: string; from: Date; to: Date }[] {
  const out: { label: string; from: Date; to: Date }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    out.push({ label: MONTH_LABELS[from.getMonth()], from, to })
  }
  return out
}

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const months = lastMonths(7)

  const [
    totalBeneficiaires,
    conseillers,
    recruteurs,
    inscriptionsParMois,
    candidaturesParMois,
    parRegion,
  ] = await Promise.all([
    prisma.utilisateur.count({ where: { deletedAt: null } }),
    prisma.agentCentre.groupBy({ by: ['cjsUid'] }).then((r) => r.length),
    prisma.organisation.count(),
    Promise.all(
      months.map((m) =>
        prisma.utilisateur.count({
          where: { createdAt: { gte: m.from, lte: m.to }, deletedAt: null },
        }),
      ),
    ),
    Promise.all(
      months.map((m) =>
        prisma.candidature.count({ where: { soumiseA: { gte: m.from, lte: m.to } } }),
      ),
    ),
    prisma.utilisateur.groupBy({
      by: ['region'],
      where: { deletedAt: null, region: { not: null } },
      _count: { _all: true },
    }),
  ])

  // Inscriptions cumulées : total actuel − somme des mois ultérieurs (approx du cumul historique).
  const sumWindow = inscriptionsParMois.reduce((s, v) => s + v, 0)
  let running = totalBeneficiaires - sumWindow + (inscriptionsParMois[0] ?? 0)
  const growthValues = months.map((_, i) => {
    if (i > 0) running += inscriptionsParMois[i]
    return running
  })

  const candidatures = months.map((m, i) => ({ m: m.label, v: candidaturesParMois[i] }))

  const accountSplit = [
    { label: 'Bénéficiaires', value: totalBeneficiaires, color: 'var(--gj-teal)' },
    { label: 'Conseillers', value: conseillers, color: 'var(--gj-blue-ink)' },
    { label: 'Recruteurs', value: recruteurs, color: 'var(--gj-yellow)' },
  ]
  const totalComptes = totalBeneficiaires + conseillers + recruteurs

  const byRegion = parRegion
    .filter((r) => r.region != null)
    .map((r) => ({ m: regionLabel(r.region as string) ?? (r.region as string), v: r._count._all }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 8)

  const data: AdminStatsData = {
    growthLabels: months.map((m) => m.label),
    growthValues,
    candidatures,
    accountSplit,
    byRegion,
    totalComptes,
  }

  return <AdminStatsClient data={data} />
}
