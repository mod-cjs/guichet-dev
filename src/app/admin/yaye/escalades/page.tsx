import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listEscalades, listYayeStaff, type EscaladeListFilters } from '@/lib/ia/admin/escalades'
import { canManageYaye } from '@/lib/ia/admin/rbac'
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
  centre?: string
  danger?: string
  retard?: string
  q?: string
  from?: string
  to?: string
}

/** Parse une date « YYYY-MM-DD » en Date valide, sinon undefined. */
function parseDate(v: string | undefined, endOfDay = false): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  const d = new Date(endOfDay ? `${v}T23:59:59.999` : `${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function parseStatut(v: string | undefined): StatutEscalade | undefined {
  return v === 'en_attente' || v === 'prise_en_charge' || v === 'resolue' ? v : undefined
}
function parseCanal(v: string | undefined): CanalAgent | undefined {
  return v === 'web' || v === 'whatsapp' ? v : undefined
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !canManageYaye(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const centre = (sp.centre ?? '').trim() || undefined
  const q = (sp.q ?? '').trim() || undefined
  const from = parseDate(sp.from)
  const to = parseDate(sp.to, true)

  const filters: EscaladeListFilters = {
    statut: parseStatut(sp.statut),
    canal: parseCanal(sp.canal),
    centreId: centre,
    dangerOnly: sp.danger === '1',
    lateOnly: sp.retard === '1',
    q,
    from,
    to,
  }

  const [{ rows, total, counts }, centres, staff] = await Promise.all([
    listEscalades(filters, page, PAGE_SIZE),
    prisma.centre.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
    listYayeStaff(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const centreNomById = new Map(centres.map((c) => [c.id, c.nom]))

  return (
    <EscaladesClient
      rows={rows.map(({ role: _role, ...r }) => ({
        ...r,
        traiteA: r.traiteA ? r.traiteA.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        echeanceSla: r.echeanceSla.toISOString(),
        centreNom: r.centreId ? (centreNomById.get(r.centreId) ?? '—') : null,
      }))}
      counts={counts}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      centres={centres}
      staff={staff}
      currentUid={session.cjsUid}
      filtres={{
        statut: parseStatut(sp.statut) ?? '',
        canal: sp.canal === 'web' || sp.canal === 'whatsapp' ? sp.canal : 'tous',
        centre: centre ?? '',
        danger: sp.danger === '1',
        retard: sp.retard === '1',
        q: q ?? '',
        from: from ? sp.from! : '',
        to: to ? sp.to! : '',
      }}
    />
  )
}
