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

  // ── Toutes les requêtes Prisma en un seul Promise.all ───────────────────
  // Regroupées pour minimiser les allers-retours base de données.
  const [
    jeunesInscrits,
    centresActifs,
    // Opportunités en brouillon = en attente de publication/modération.
    // StatutOpportunite n'a pas de valeur "pending" : on utilise `brouillon`.
    opportunitesAModerer,
    // KPI 4 — candidatures retenues ce mois (libellé « Candidatures retenues »).
    insertionsMois,
    // Conseillers : count distinct cjsUid dans AgentCentre.
    conseillers,
    // Recruteurs : count distinct Organisations (proxy recruteurs).
    recruteurs,
    monthlyCandidaturesRaw,
    centresGeoRaw,
    candidaturesMois,
    ateliersTenus,
    insertionJeunesRows,
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

    // KPI 4 — candidatures retenues ce mois (Candidature statut Retenue, créées ce mois)
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

    // BarChart — candidatures retenues / mois : Candidature statut Retenue par tranche
    Promise.all(
      months.map(({ from, to }) =>
        prisma.candidature.count({
          where: { statut: 'Retenue', soumiseA: { gte: from, lte: to } },
        })
      )
    ),

    // Carte — centres géolocalisés (filtre les coordonnées (0,0) = fantômes en mer)
    prisma.centre.findMany({
      where: {
        estActif: true,
        NOT: { AND: [{ latitude: 0 }, { longitude: 0 }] },
      },
      select: { id: true, nom: true, latitude: true, longitude: true, region: true, slug: true },
      orderBy: { nom: 'asc' },
    }),

    // Indicateur secondaire — toutes les candidatures du mois (tous statuts)
    prisma.candidature.count({ where: { soumiseA: { gte: monthStart, lte: monthEnd } } }),

    // Indicateur secondaire — ateliers déjà tenus
    prisma.evenement.count({ where: { statut: 'termine' } }),

    // Indicateur secondaire — taux d'insertion (modèle Insertion réel)
    prisma.insertion.groupBy({ by: ['cjsUid'] }),

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
  // Math.max(0, ...) évite les valeurs négatives si les suppressions de comptes
  // dépassent les inscriptions sur une tranche (ex. purge RGPD).
  const growthSeries = months
    .map(({ label }, i) => {
      const idx = months.length - 1 - i
      const cumulative = Math.max(0, runningTotal)
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

  // ── Candidatures retenues / mois (BarChart) ──────────────────────────────
  // Source : Candidature statut=Retenue par tranche mensuelle.
  // Libellé « Candidatures retenues / mois » (distinct du modèle Insertion).
  const monthlyCandidatures = months.map(({ label }, i) => ({
    m: label,
    v: monthlyCandidaturesRaw[i] ?? 0,
  }))

  // ── Centres géolocalisés (carte « Présence nationale ») ───────────────────
  // Les centres sans coordonnées (latitude=0, longitude=0) sont exclus pour
  // éviter un marker fantôme au large des côtes africaines.
  const centres = centresGeoRaw.map((c) => ({
    id: c.id,
    nom: c.nom,
    latitude: c.latitude,
    longitude: c.longitude,
    region: String(c.region),
    slug: c.slug ?? '',
  }))

  const jeunesNouveauxMois = monthlyCounts[monthlyCounts.length - 1] ?? 0
  const insLast = monthlyCandidaturesRaw[monthlyCandidaturesRaw.length - 1] ?? 0
  const insPrev = monthlyCandidaturesRaw[monthlyCandidaturesRaw.length - 2] ?? 0
  const insertionsDeltaPct = insPrev > 0 ? Math.round(((insLast - insPrev) / insPrev) * 100) : null

  // Taux d'insertion = jeunes ayant ≥1 Insertion / total bénéficiaires
  // (cohorte = tous les inscrits ; à affiner avec le PO si cohorte « accompagnés »).
  const tauxInsertion = jeunesInscrits > 0
    ? Math.round((insertionJeunesRows.length / jeunesInscrits) * 100)
    : 0
  const nf = (n: number) => n.toLocaleString('fr-FR')

  const secondaires = [
    { label: "Taux d'insertion moyen", value: `${tauxInsertion}%`, icon: 'trending' as const },
    { label: 'Candidatures (mois)', value: nf(candidaturesMois), icon: 'document' as const },
    { label: 'Ateliers tenus', value: nf(ateliersTenus), icon: 'calendar' as const },
    { label: 'Partenaires actifs', value: nf(recruteurs), icon: 'employment' as const },
  ]

  const data: DashboardData = {
    kpis: {
      jeunesInscrits,
      centresActifs,
      aModerer: opportunitesAModerer,
      insertionsMois: insertionsMois,
      jeunesNouveauxMois,
      insertionsDeltaPct,
    },
    growthSeries,
    accountSplit,
    monthlyCandidatures,
    centres,
    secondaires,
  }

  return <AdminDashboardClient data={data} />
}
