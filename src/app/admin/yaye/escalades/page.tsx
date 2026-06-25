import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listEscalades, type EscaladeListFilters } from '@/lib/ia/admin/escalades'
import { EscaladesClient } from './EscaladesClient'
import type { CanalAgent, StatutEscalade } from '@prisma/client'

// Panel admin — File d'escalade Yaye → opérateur humain (Lot 6, GUIC-259).
// RBAC admin. Statut traitable (en_attente / prise_en_charge / resolue).

export const metadata: Metadata = { title: 'Escalades Yaye — Admin CJS' }

const PAGE_SIZE = 20

interface SP {
  page?: string
  statut?: string
  canal?: string
}

function parseStatut(v: string | undefined): StatutEscalade | undefined {
  return v === 'en_attente' || v === 'prise_en_charge' || v === 'resolue' ? v : undefined
}
function parseCanal(v: string | undefined): CanalAgent | undefined {
  return v === 'web' || v === 'whatsapp' ? v : undefined
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const filters: EscaladeListFilters = {
    statut: parseStatut(sp.statut),
    canal: parseCanal(sp.canal),
  }

  const { rows, total, counts } = await listEscalades(filters, page, PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <EscaladesClient
      rows={rows.map((r) => ({
        ...r,
        traiteA: r.traiteA ? r.traiteA.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      }))}
      counts={counts}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      filtres={{
        statut: parseStatut(sp.statut) ?? '',
        canal: sp.canal === 'web' || sp.canal === 'whatsapp' ? sp.canal : 'tous',
      }}
    />
  )
}
