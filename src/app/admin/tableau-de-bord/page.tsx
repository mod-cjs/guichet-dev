import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminDashboardClient, type DashboardData } from './AdminDashboardClient'

export const metadata: Metadata = { title: 'Tableau de bord — Administration CJS' }

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Retourne les 7 derniers mois (du plus ancien au plus récent). */
function getLast7Months(): { from: Date; to: Date; label: string }[] {
  const now = new Date()
  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const from = new Date(d.getFullYear(), d.getMonth(), 1)
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    result.push({ from, to, label: label.charAt(0).toUpperCase() + label.slice(1, 3) })
  }
  return result
}

/** Début du mois courant. */
function startOfCurrentMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ── Page serveur ─────────────────────────────────────────────────────────────

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const months = getLast7Months()
  const monthStart = startOfCurrentMonth()
  const monthEnd = new Date()

  // ── Requêtes Prisma en parallèle ────────────────────────────────────────
  const [
    jeunesInscrits,
    centresActifs,
    // Opportunités en brouillon = en attente de publication/modération.
    // StatutOpportunite n'a pas de valeur "pending" : on utilise `brouillon`.
    opportunitesAModerer,
    // Insertions ce mois : candidatures avec statut Retenue créées ce mois.
    insertionsMois,
    // Conseillers : count distinct cjsUid dans AgentCentre.
    conseillers,
    // Recruteurs : count distinct Organisations (proxy recruteurs).
    recruteurs,
    // Croissance mensuelle : count Utilisateur.createdAt par tranche mensuelle.
    ...monthlyCountsRaw
  ] = await Promise.all([
    // KPI 1 — jeunes inscrits (deletedAt null)
    prisma.utilisateur.count({ where: { deletedAt: null } }),

    // KPI 2 — centres actifs
    prisma.centre.count({ where: { estActif: true } }),

    // KPI 3 — à modérer (brouillon = non encore publiées, deletedAt null)
    prisma.opportunite.count({
      where: { statut: 'brouillon', deletedAt: null },
    }),

    // KPI 4 — insertions ce mois (Candidature statut Retenue, créées ce mois)
    prisma.candidature.count({
      where: {
        statut: 'Retenue',
        soumiseA: { gte: monthStart, lte: monthEnd },
      },
    }),

    // Donut — conseillers (count distinct cjsUid dans AgentCentre)
    prisma.agentCentre.groupBy({ by: ['cjsUid'] }).then((rows) => rows.length),

    // Donut — recruteurs (count Organisations distinctes)
    prisma.organisation.count(),

    // Croissance — 7 tranches mensuelles
    ...months.map(({ from, to }) =>
      prisma.utilisateur.count({
        where: { createdAt: { gte: from, lte: to }, deletedAt: null },
      })
    ),
  ])

  // ── Croissance cumulée ───────────────────────────────────────────────────
  // monthlyCountsRaw = [count_month0, count_month1, …, count_month6]
  // On reconstitue le cumulatif depuis le total actuel − somme des derniers mois.
  const monthlyCounts = monthlyCountsRaw as number[]

  let runningTotal = jeunesInscrits
  // Retranche les mois du plus récent au plus ancien pour approximer le cumulatif.
  const growthSeries = months
    .map(({ label }, i) => {
      const idx = months.length - 1 - i
      const cumulative = runningTotal
      runningTotal -= monthlyCounts[months.length - 1 - i] ?? 0
      return { month: months[idx].label, cumulative }
    })
    .reverse()

  // ── Répartition comptes ──────────────────────────────────────────────────
  // Bénéficiaires ≈ tous les Utilisateur (les conseillers/recruteurs ont aussi
  // une entrée Utilisateur mais on ne peut pas les distinguer sans rôle SSO
  // dans notre DB — on utilise les counts dérivés des tables de relation).
  const accountSplit = [
    {
      label: 'Bénéficiaires',
      value: Math.max(0, jeunesInscrits - conseillers),
      color: 'var(--gj-teal)',
    },
    {
      label: 'Conseillers',
      value: conseillers,
      color: 'var(--gj-teal-deep)',
    },
    {
      label: 'Recruteurs',
      value: recruteurs,
      color: 'var(--gj-blue)',
    },
  ].filter((s) => s.value > 0)

  // ── Insertions par mois (BarChart) ───────────────────────────────────────
  // Proxy : Candidature statut Retenue par mois (même période que growthSeries).
  const monthlyCandidaturesRaw = await Promise.all(
    months.map(({ from, to }) =>
      prisma.candidature.count({
        where: {
          statut: 'Retenue',
          soumiseA: { gte: from, lte: to },
        },
      })
    )
  )

  const monthlyCandidatures = months.map(({ label }, i) => ({
    m: label,
    v: monthlyCandidaturesRaw[i] ?? 0,
  }))

  // ── Centres géolocalisés (carte « Présence nationale ») ───────────────────
  const centresGeo = await prisma.centre.findMany({
    where: { estActif: true },
    select: { id: true, nom: true, latitude: true, longitude: true, region: true, slug: true },
    orderBy: { nom: 'asc' },
  })
  const centres = centresGeo.map((c) => ({
    id: c.id,
    nom: c.nom,
    latitude: c.latitude,
    longitude: c.longitude,
    region: String(c.region),
    slug: c.slug ?? '',
  }))

  const data: DashboardData = {
    kpis: {
      jeunesInscrits,
      centresActifs,
      aModerer: opportunitesAModerer,
      insertionsMois: insertionsMois,
    },
    growthSeries,
    accountSplit,
    monthlyCandidatures,
    centres,
  }

  return <AdminDashboardClient data={data} />
}
