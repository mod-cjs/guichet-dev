import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getCurationData, parseOngletC, type ChipC } from '@/lib/loaders/admin-curation'
import { CurationList } from './CurationList'

export const metadata: Metadata = { title: 'Curation — Admin CJS' }

const CHIPS: ChipC[] = ['tout', 'score', 'doublons']

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; chip?: string; source?: string; scoreMin?: string; page?: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const onglet = parseOngletC(sp.onglet)
  const chip: ChipC = CHIPS.includes(sp.chip as ChipC) ? (sp.chip as ChipC) : 'tout'
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const scoreMin = Number(sp.scoreMin)

  const { rows, currentPage, totalPages, chips, veille } = await getCurationData({
    onglet,
    chip,
    source: sp.source,
    scoreMin: Number.isFinite(scoreMin) ? scoreMin : undefined,
    page,
  })

  return (
    <CurationList
      rows={rows}
      chips={chips}
      veille={veille}
      onglet={onglet}
      chip={chip}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  )
}
