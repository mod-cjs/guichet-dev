import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { auditPiiAccess } from '@/lib/audit'
import { getUtilisateurDetail } from '@/lib/loaders/utilisateur-detail'
import { UserDetailTabs } from './UserDetailTabs'
import { RolesRattachementsSection } from './RolesRattachementsSection'

export const metadata: Metadata = { title: 'Fiche utilisateur — Admin CJS' }

export default async function Page({ params }: { params: Promise<{ cjsUid: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { cjsUid } = await params

  const [data, rattachements, organisation, centres, organisations] = await Promise.all([
    getUtilisateurDetail(cjsUid),
    // GUIC-526 — provisioning des espaces (rattachement centre + rôle agent, organisation recruteur).
    prisma.agentCentre.findMany({ where: { cjsUid }, select: { id: true, role: true, centre: { select: { nom: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.organisation.findFirst({ where: { cjsUid }, select: { id: true, nom: true } }),
    prisma.centre.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
    prisma.organisation.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' }, take: 200 }),
  ])

  if (!data) notFound()

  // Traçabilité CDP : consultation d'une fiche (PII) journalisée. Fail-soft.
  await auditPiiAccess('fiche_beneficiaire.view', session.cjsUid, { targetCjsUid: cjsUid })

  return (
    <UserDetailTabs
      data={data}
      rolesSection={
        <RolesRattachementsSection
          cjsUid={cjsUid}
          rattachements={rattachements.map((r) => ({ id: r.id, role: r.role, centreNom: r.centre.nom }))}
          centres={centres}
          organisation={organisation}
          organisations={organisations}
        />
      }
    />
  )
}
