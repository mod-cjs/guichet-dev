import { prisma } from '@/lib/prisma'
import type { Prisma, Region, StatutCompte } from '@prisma/client'
import { deriveRole } from '@/lib/loaders/derive-role'

/**
 * Loader Utilisateurs (admin — SUPERVISION, GUIC-701). Helpers purs (testables sans DB)
 * + agrégation KPIs. Le rôle SSO est en **lecture seule** (source = SSO).
 * ⚠️ Garde-fou (spike) : `select` ciblé (jamais `include` plein → TransformError adapter).
 * Subtilité data : le « jeune » a 3 formes en base — `role` null, `'jeune'`, `'beneficiaire'`.
 */

export const PAGE_SIZE_U = 20

export type RoleFiltre = 'jeune' | 'conseiller' | 'recruteur' | 'admin' | ''
export type SortU = 'completude' | 'seen' | 'recent'
const STAFF_ROLES = ['conseiller', 'recruteur', 'admin'] as const
const JEUNE_ROLES = ['jeune', 'beneficiaire'] as const
const REGIONS: Region[] = ['Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou']
const STATUTS = new Set<StatutCompte>(['actif', 'inactif', 'anonymise'])

export function parseRoleU(v: string | undefined): RoleFiltre {
  return v === 'jeune' || v === 'conseiller' || v === 'recruteur' || v === 'admin' ? v : ''
}
export function parseStatutU(v: string | undefined): StatutCompte | '' {
  return v && STATUTS.has(v as StatutCompte) ? (v as StatutCompte) : ''
}
export function parseRegionU(v: string | undefined): Region | '' {
  return v && REGIONS.includes(v as Region) ? (v as Region) : ''
}
export function parseSortU(v: string | undefined): SortU {
  return v === 'completude' || v === 'seen' ? v : 'recent'
}

/** WHERE : rôle (jeune = null/jeune/beneficiaire ; staff exact) + statut + région + recherche. */
export function buildUtilisateurWhere(opts: { q: string; role: RoleFiltre; statut: StatutCompte | ''; region: Region | '' }): Prisma.UtilisateurWhereInput {
  const where: Prisma.UtilisateurWhereInput = {}
  const clauses: Prisma.UtilisateurWhereInput[] = []
  if (opts.role === 'jeune') clauses.push({ OR: [{ role: null }, { role: { in: [...JEUNE_ROLES] } }] })
  else if (opts.role) where.role = opts.role
  if (opts.statut) where.statut = opts.statut
  if (opts.region) where.region = opts.region
  if (opts.q) {
    const q = opts.q
    clauses.push({ OR: [{ nom: { contains: q } }, { prenom: { contains: q } }, { email: { contains: q } }, { telephone: { contains: q } }, { cjsUid: { contains: q } }] })
  }
  if (clauses.length === 1) Object.assign(where, clauses[0])
  else if (clauses.length > 1) where.AND = clauses
  return where
}

export function orderByForSortU(sort: SortU): Prisma.UtilisateurOrderByWithRelationInput[] {
  if (sort === 'completude') return [{ profil: { completionScore: 'desc' } }]
  if (sort === 'seen') return [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }]
  return [{ createdAt: 'desc' }]
}

// ─── Ligne ─────────────────────────────────────────────────────────────────────
export interface UtilisateurRowInput {
  cjsUid: string; prenom: string; nom: string
  email: string | null; telephone: string | null
  role: string | null; region: string | null; statut: StatutCompte
  lastSeenAt: Date | null
  profil: { completionScore: number } | null
}
export interface AdminUserRow {
  cjsUid: string; prenom: string; nom: string
  email: string | null; telephone: string | null
  role: string | null; region: string | null; statut: StatutCompte
  completude: number | null
  lastSeenAt: Date | null
}

export function estJeune(role: string | null): boolean {
  return role == null || (JEUNE_ROLES as readonly string[]).includes(role)
}

export function mapUtilisateurRow(u: UtilisateurRowInput): AdminUserRow {
  const anon = u.statut === 'anonymise'
  return {
    cjsUid: u.cjsUid,
    prenom: u.prenom,
    nom: u.nom,
    email: anon ? null : u.email,
    telephone: anon ? null : u.telephone,
    role: u.role,
    region: u.region,
    statut: u.statut,
    completude: estJeune(u.role) && u.profil ? u.profil.completionScore : null,
    lastSeenAt: u.lastSeenAt,
  }
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
export interface UtilisateursKpis { comptes: number; jeunes: number; staff: number; completudeMoyenne: number }
type RoleCount = { role: string | null; _count: { cjsUid: number } }

export function kpisUtilisateurs(input: { total: number; parRole: RoleCount[]; completudeMoyenne: number | null }): UtilisateursKpis {
  const sum = (pred: (r: string | null) => boolean) => input.parRole.filter((r) => pred(r.role)).reduce((a, r) => a + r._count.cjsUid, 0)
  return {
    comptes: input.total,
    jeunes: sum((r) => estJeune(r)),
    staff: sum((r) => r != null && (STAFF_ROLES as readonly string[]).includes(r)),
    completudeMoyenne: input.completudeMoyenne == null ? 0 : Math.round(input.completudeMoyenne),
  }
}

// ─── Agrégat (async, DB) ───────────────────────────────────────────────────────
export interface UtilisateursData { rows: AdminUserRow[]; total: number; totalPages: number; kpis: UtilisateursKpis }

export async function getUtilisateursData(params: { page: number; q: string; role: string; statut: string; region: string; sort: string }): Promise<UtilisateursData> {
  const page = Math.max(1, params.page || 1)
  const where = buildUtilisateurWhere({ q: params.q.trim(), role: parseRoleU(params.role), statut: parseStatutU(params.statut), region: parseRegionU(params.region) })
  const [rowsRaw, total, parRole, compAgg] = await Promise.all([
    prisma.utilisateur.findMany({
      where,
      orderBy: orderByForSortU(parseSortU(params.sort)),
      skip: (page - 1) * PAGE_SIZE_U,
      take: PAGE_SIZE_U,
      select: {
        cjsUid: true, prenom: true, nom: true, email: true, telephone: true, role: true, region: true, statut: true, lastSeenAt: true,
        profil: { select: { completionScore: true } },
      },
    }),
    prisma.utilisateur.count({ where }),
    prisma.utilisateur.groupBy({ by: ['role'], _count: { cjsUid: true } }),
    prisma.profilJeune.aggregate({ _avg: { completionScore: true } }),
  ])

  // Rôle RÉEL dérivé (le cache SSO est souvent null) — 2 requêtes bornées à la page (pas de N+1).
  const ids = rowsRaw.map((u) => u.cjsUid)
  const [agents, recruteurs] = ids.length
    ? await Promise.all([
        prisma.agentCentre.findMany({ where: { cjsUid: { in: ids } }, select: { cjsUid: true }, distinct: ['cjsUid'] }),
        prisma.organisation.findMany({ where: { cjsUid: { in: ids } }, select: { cjsUid: true }, distinct: ['cjsUid'] }),
      ])
    : [[], []]
  const agentSet = new Set(agents.map((a) => a.cjsUid))
  const recruteurSet = new Set(recruteurs.map((o) => o.cjsUid))

  return {
    rows: rowsRaw.map((u) => mapUtilisateurRow({
      ...(u as UtilisateurRowInput),
      role: deriveRole({ cachedRole: u.role, isAgent: agentSet.has(u.cjsUid), isRecruteur: recruteurSet.has(u.cjsUid) }),
    })),
    total,
    totalPages: Math.ceil(total / PAGE_SIZE_U),
    kpis: kpisUtilisateurs({ total, parRole: parRole as RoleCount[], completudeMoyenne: compAgg._avg.completionScore }),
  }
}
