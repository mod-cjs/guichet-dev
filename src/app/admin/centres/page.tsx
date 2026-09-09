import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { loadProgrammeOptions } from '@/lib/programmes/options'
import { statutOuverture } from '@/lib/centre-horaire'
import { CentresAdminTable, type CentreRow, type CentresStats } from './centres-admin-table'

export const metadata: Metadata = { title: 'Centres CJS — Admin' }

const NOUVEAU_MS = 30 * 86_400_000 // « Nouveau » = créé il y a < 30 j

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const centres = await prisma.centre.findMany({
    select: {
      id: true, nom: true, region: true, adresse: true, latitude: true, longitude: true,
      telephone: true, responsable: true, ville: true, createdAt: true, estActif: true, services: true,
      horaires: { select: { jour: true, ouvert: true, ouvreA: true, fermeA: true } },
      _count: { select: { profilsRattaches: true, agents: true, insertions: true } },
    },
    orderBy: { nom: 'asc' },
  })

  // Conseillers distincts (rattachements agents) pour le KPI réseau.
  const conseillers = (await prisma.agentCentre.groupBy({ by: ['cjsUid'] })).length
  const programmes = await loadProgrammeOptions(prisma)

  const now = new Date()
  const rows: CentreRow[] = centres.map((c) => {
    const jeunes = c._count.profilsRattaches
    const st = statutOuverture(c.horaires, now)
    return {
      id: c.id, nom: c.nom, region: String(c.region), adresse: c.adresse,
      latitude: c.latitude, longitude: c.longitude, telephone: c.telephone,
      responsable: c.responsable, ville: c.ville, createdAt: c.createdAt, estActif: c.estActif,
      staff: c._count.agents,
      jeunes,
      insertion: jeunes > 0 ? Math.round((c._count.insertions / jeunes) * 100) : 0,
      ouvert: st.ouvert,
      fermeA: st.ouvert ? st.label.replace(/^Ouvert · ferme /, '') : null,
      services: Array.isArray(c.services) ? (c.services as string[]) : [],
      nouveau: now.getTime() - c.createdAt.getTime() < NOUVEAU_MS,
    }
  })

  const stats: CentresStats = {
    actifs: rows.filter((r) => r.estActif).length,
    total: rows.length,
    conseillers,
    jeunes: rows.reduce((s, r) => s + r.jeunes, 0),
    regions: new Set(rows.map((r) => r.region)).size,
  }

  return <CentresAdminTable centres={rows} stats={stats} programmes={programmes} />
}
