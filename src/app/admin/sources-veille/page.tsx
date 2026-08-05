import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { getSourcesData } from '@/lib/loaders/admin-sources'
import { SourcesAdminTable } from './sources-admin-table'

export const metadata: Metadata = { title: 'Sources de veille — Admin CJS' }

/**
 * GUIC-596/704 — gestion des sources de veille (curation). Table refondue avec
 * santé par source (dernière collecte) + collecte manuelle (« Lancer la collecte »).
 */
export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const [{ rows, nbActives, nbEnEchec }, types] = await Promise.all([
    getSourcesData(),
    prisma.opportuniteType.findMany({ where: { actif: true }, orderBy: { ordre: 'asc' }, select: { id: true, libelle: true } }),
  ])

  return <SourcesAdminTable sources={rows} types={types} nbActives={nbActives} nbEnEchec={nbEnEchec} />
}
