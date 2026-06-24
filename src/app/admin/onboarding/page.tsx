import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  AdminOnboardingFunnel,
  type FunnelData,
  type RegionFunnel,
  type MoisInscriptions,
} from './AdminOnboardingFunnel'

export const metadata: Metadata = { title: 'Onboarding — Admin CJS' }

const RELANCE_JOURS = 7

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const seuilRelance = new Date(Date.now() - RELANCE_JOURS * 86_400_000)

  // Fenêtres mensuelles (6 derniers mois) pour les nouvelles inscriptions.
  const now = new Date()
  const mois = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    return { start, end, label: start.toLocaleDateString('fr-FR', { month: 'short' }) }
  })

  const [total, onboardes, enCours, aRelancer, avg, regionGroups, moisCounts] = await Promise.all([
    prisma.utilisateur.count({ where: { deletedAt: null } }),
    prisma.utilisateur.count({ where: { deletedAt: null, onboardingComplete: true } }),
    prisma.onboardingDraft.count(),
    prisma.onboardingDraft.count({ where: { updatedAt: { lt: seuilRelance } } }),
    prisma.profilJeune.aggregate({ _avg: { completionScore: true } }),
    prisma.utilisateur.groupBy({
      by: ['region', 'onboardingComplete'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    Promise.all(
      mois.map((m) =>
        prisma.utilisateur.count({ where: { deletedAt: null, createdAt: { gte: m.start, lt: m.end } } }),
      ),
    ),
  ])

  // Agrégation par région.
  const regionMap = new Map<string, { total: number; onboardes: number }>()
  for (const g of regionGroups) {
    const key = g.region ?? 'Inconnue'
    const e = regionMap.get(key) ?? { total: 0, onboardes: 0 }
    e.total += g._count._all
    if (g.onboardingComplete) e.onboardes += g._count._all
    regionMap.set(key, e)
  }
  const parRegion: RegionFunnel[] = Array.from(regionMap.entries())
    .map(([region, v]) => ({
      region,
      total: v.total,
      onboardes: v.onboardes,
      taux: v.total > 0 ? Math.round((v.onboardes / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const inscriptionsParMois: MoisInscriptions[] = mois.map((m, i) => ({
    mois: m.label,
    count: moisCounts[i],
  }))

  const data: FunnelData = {
    total,
    onboardes,
    tauxComplete: total > 0 ? Math.round((onboardes / total) * 100) : 0,
    enCours,
    aRelancer,
    completudeMoyenne: Math.round(avg._avg.completionScore ?? 0),
    parRegion,
    inscriptionsParMois,
  }

  return <AdminOnboardingFunnel data={data} />
}
