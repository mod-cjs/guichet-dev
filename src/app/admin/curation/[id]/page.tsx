import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { CurationDetail } from './CurationDetail'

export const metadata: Metadata = { title: 'Valider une opportunité — Admin CJS' }

/** GUIC-600 — US-5 : détail éditable d'un item de curation avant validation. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { id } = await params
  const item = await prisma.itemCuration.findUnique({
    where: { id },
    include: { source: { select: { nom: true } } },
  })
  if (!item) notFound()

  const p = (item.payloadExtrait as Record<string, unknown> | null) ?? {}
  const str = (v: unknown) => (typeof v === 'string' ? v : '')

  const types = await prisma.opportuniteType.findMany({
    where: { actif: true },
    orderBy: { ordre: 'asc' },
    select: { id: true, libelle: true },
  })

  return (
    <CurationDetail
      id={item.id}
      statut={item.statut}
      score={item.scoreCompletude ?? 0}
      sourceNom={item.source.nom}
      urlSource={item.urlCanonique}
      motifRejet={item.motifRejet}
      champs={{
        titre: item.titre ?? str(p.titre),
        description: str(p.description),
        organisation: str(p.organisation),
        region: str(p.region),
        domaine: str(p.domaine),
        typeId: str(p.typeId),
        deadline: str(p.deadline),
        lienSource: str(p.lienSource) || item.urlCanonique,
      }}
      types={types}
    />
  )
}
