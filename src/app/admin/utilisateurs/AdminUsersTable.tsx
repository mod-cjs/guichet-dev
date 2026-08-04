'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import type { StatutCompte } from '@prisma/client'
import type { AdminUserRow, UtilisateursKpis, SortU } from '@/lib/loaders/admin-utilisateurs'

export type { AdminUserRow, UtilisateursKpis } from '@/lib/loaders/admin-utilisateurs'

// Bénéficiaire = rôle null / 'jeune' / 'beneficiaire' (défini localement : ne pas importer
// une valeur du loader — il tire prisma, cassant le bundle client).
function estJeune(role: string | null): boolean {
  return role == null || role === 'jeune' || role === 'beneficiaire'
}

export interface AdminUsersTableProps {
  rows: AdminUserRow[]
  kpis: UtilisateursKpis
  total: number
  currentPage: number
  totalPages: number
  q: string
  role: string
  statut: string
  region: string
  sort: SortU
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function roleLabel(role: string | null): string {
  if (estJeune(role)) return 'Bénéficiaire'
  return { conseiller: 'Conseiller', recruteur: 'Recruteur', admin: 'Admin' }[role as string] ?? role ?? '—'
}
function roleColors(role: string | null): { bg: string; fg: string } {
  if (role === 'admin') return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-admin-gold)' }
  if (role === 'recruteur') return { bg: 'rgba(196,160,255,.16)', fg: '#C4A0FF' }
  if (role === 'conseiller') return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
  return { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
}
const STATUT_LABEL: Record<string, string> = { actif: 'Actif', inactif: 'Inactif', anonymise: 'Anonymisé' }
function statutColors(s: string): { bg: string; fg: string; dot: boolean } {
  if (s === 'actif') return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)', dot: true }
  if (s === 'anonymise') return { bg: 'var(--gj-line)', fg: 'var(--gj-grey)', dot: false }
  return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)', dot: false }
}
function compColor(c: number): string { return c >= 70 ? 'var(--gj-green-ink)' : c >= 40 ? 'var(--gj-admin-gold)' : 'var(--gj-red-ink)' }
function regionLabel(r: string | null): string { return r ? r.replace('_', '-') : '—' }
function initials(p: string, n: string): string { return ((p.trim()[0] ?? '') + (n.trim()[0] ?? '')).toUpperCase() }
function relSeen(d: Date | null): string {
  if (!d) return 'jamais'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  const m = Math.floor(days / 30)
  return m < 12 ? `il y a ${m} mois` : `il y a ${Math.floor(m / 12)} an(s)`
}

const ROLES = [
  { value: '', label: 'Tous rôles' }, { value: 'jeune', label: 'Jeunes' },
  { value: 'conseiller', label: 'Conseillers' }, { value: 'recruteur', label: 'Recruteurs' }, { value: 'admin', label: 'Admins' },
]
const STATUTS: { value: StatutCompte | ''; label: string }[] = [
  { value: '', label: 'Tout statut' }, { value: 'actif', label: 'Actifs' }, { value: 'inactif', label: 'Inactifs' }, { value: 'anonymise', label: 'Anonymisés' },
]
const REGIONS = ['Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou']

const GRID = 'minmax(0,1.5fr) minmax(0,1.4fr) .8fr .8fr .9fr .8fr .9fr .5fr'

// ─── Composant (supervision — le rôle SSO est en lecture seule) ────────────────
export function AdminUsersTable({ rows, kpis, total, currentPage, totalPages, q, role, statut, region, sort }: AdminUsersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function push(next: Partial<{ q: string; role: string; statut: string; region: string; sort: string }>) {
    const m = { q, role, statut, region, sort, ...next }
    const sp = new URLSearchParams()
    if (m.q) sp.set('q', m.q)
    if (m.role) sp.set('role', m.role)
    if (m.statut) sp.set('statut', m.statut)
    if (m.region) sp.set('region', m.region)
    if (m.sort && m.sort !== 'recent') sp.set('sort', m.sort)
    startTransition(() => router.push(sp.toString() ? `${pathname}?${sp}` : pathname))
  }
  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    push({ q: (new FormData(e.currentTarget).get('q')?.toString() ?? '').trim() })
  }
  const exportUrl = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q); if (role) sp.set('role', role); if (statut) sp.set('statut', statut); if (region) sp.set('region', region)
    const s = sp.toString(); return s ? `/api/admin/export/utilisateurs?${s}` : '/api/admin/export/utilisateurs'
  })()
  const pagBase = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q); if (role) sp.set('role', role); if (statut) sp.set('statut', statut); if (region) sp.set('region', region); if (sort !== 'recent') sp.set('sort', sort)
    const s = sp.toString(); return s ? `${pathname}?${s}` : pathname
  })()

  const KPI = [
    { lab: 'Comptes', val: kpis.comptes.toLocaleString('fr-FR') },
    { lab: 'Jeunes', val: kpis.jeunes.toLocaleString('fr-FR'), pill: 'bénéficiaires', tone: 'g' as const },
    { lab: 'Staff (conseillers · recruteurs · admins)', val: kpis.staff.toLocaleString('fr-FR'), pill: 'équipes & partenaires' },
    { lab: 'Complétude moyenne', val: `${kpis.completudeMoyenne}`, unit: '%', pill: 'profils', tone: 'w' as const },
  ]
  const sortBtn = (label: string, key: SortU) => (
    <button type="button" onClick={() => push({ sort: sort === key ? 'recent' : key })} aria-label={`Trier par ${label.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, padding: 0, font: 'inherit', color: sort === key ? 'var(--gj-admin-gold)' : 'var(--gj-grey)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.4px', cursor: 'pointer' }}>{label} <Icon name="chevron-down" size={12} /></button>
  )

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Utilisateurs</h1>
            <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>{total.toLocaleString('fr-FR')} comptes · supervision · rôle géré par le SSO</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={exportUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, padding: '0 14px', minHeight: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)', textDecoration: 'none' }}><Icon name="download" size={15} /> Exporter (CDP)</a>
            <form role="search" onSubmit={onSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 13px', minHeight: 42, width: 300 }}>
              <span aria-hidden style={{ color: 'var(--gj-grey)', display: 'inline-flex' }}><Icon name="search" size={16} /></span>
              <input type="search" name="q" placeholder="Nom, e-mail, téléphone, cjs_uid… (Entrée)" defaultValue={q} aria-label="Rechercher un utilisateur" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gj-ink)' }} />
            </form>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }} className="max-md:!grid-cols-2">
          {KPI.map((k) => {
            const ps = k.tone === 'g' ? { background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' } : k.tone === 'w' ? { background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' } : { background: 'var(--gj-line)', color: 'var(--gj-grey)' }
            return (
              <div key={k.lab} style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: '14px 15px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gj-grey)' }}>{k.lab}</div>
                <div className="num" style={{ fontSize: 24, fontWeight: 900, margin: '5px 0 6px', color: 'var(--gj-ink)' }}>{k.val}{k.unit && <small style={{ fontSize: 13, color: 'var(--gj-grey)', fontWeight: 700 }}>{k.unit}</small>}</div>
                {k.pill && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, ...ps }}>{k.pill}</span>}
              </div>
            )
          })}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          {ROLES.map((r) => <Chip key={r.value || 'all'} selected={role === r.value} aria-pressed={role === r.value} onClick={() => push({ role: r.value })}>{r.label}</Chip>)}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {STATUTS.map((s) => <Chip key={s.value || 'all'} selected={statut === s.value} aria-pressed={statut === s.value} onClick={() => push({ statut: s.value })}>{s.label}</Chip>)}
          <span style={{ flex: 1 }} />
          <select aria-label="Filtrer par région" value={region} onChange={(e) => push({ region: e.target.value })} style={{ minHeight: 38, borderRadius: 10, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)', fontSize: 13, fontFamily: 'inherit', padding: '0 12px' }}>
            <option value="">Toutes régions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r.replace('_', '-')}</option>)}
          </select>
        </div>

        {/* Table desktop */}
        <div className="hidden md:block" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px', minWidth: 880 }}>
            <span>Utilisateur</span><span>Coordonnées</span><span>Rôle</span><span>Région</span>
            <span role="columnheader">{sortBtn('Complétude', 'completude')}</span>
            <span role="columnheader">Statut</span>
            <span role="columnheader">{sortBtn('Dernière visite', 'seen')}</span>
            <span></span>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>Aucun utilisateur trouvé.</div>
          ) : rows.map((u) => {
            const rc = roleColors(u.role), sc = statutColors(u.statut)
            return (
              <div key={u.cjsUid} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--gj-line)', alignItems: 'center', minWidth: 880 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'var(--gj-line)', color: 'var(--gj-admin-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12 }}>{initials(u.prenom, u.nom)}</span>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gj-ink)' }}>{u.prenom} {u.nom}</b>
                    <div className="num" style={{ fontSize: 10.5, color: 'var(--gj-grey)', fontFamily: 'ui-monospace, monospace' }}>{u.cjsUid}</div>
                  </div>
                </div>
                <div style={{ minWidth: 0, fontSize: 12, color: 'var(--gj-grey)', display: 'flex', flexDirection: 'column' }}>
                  {u.email == null && u.telephone == null
                    ? <span>—</span>
                    : <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? '—'}</span><span>{u.telephone ?? '—'}</span></>}
                </div>
                <span><span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: rc.bg, color: rc.fg, whiteSpace: 'nowrap' }}>{roleLabel(u.role)}</span></span>
                <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{regionLabel(u.region)}</span>
                <span>
                  {u.completude == null ? <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>—</span> : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 46, height: 7, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden' }}><span aria-hidden style={{ display: 'block', height: '100%', width: `${u.completude}%`, background: compColor(u.completude) }} /></span>
                      <b className="num" style={{ fontSize: 12, color: 'var(--gj-ink)' }}>{u.completude}%</b>
                    </span>
                  )}
                </span>
                <span><span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.fg, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>{sc.dot && <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gj-green-ink)' }} />}{STATUT_LABEL[u.statut] ?? u.statut}</span></span>
                <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{relSeen(u.lastSeenAt)}</span>
                <span style={{ textAlign: 'right' }}><Link href={`/admin/utilisateurs/${u.cjsUid}`} style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gj-admin-gold)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Détail ›</Link></span>
              </div>
            )
          })}
        </div>

        {/* Cartes mobiles */}
        {rows.length === 0 ? (
          <div className="md:hidden" style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14 }}>Aucun utilisateur trouvé.</div>
        ) : (
          <div className="md:hidden flex flex-col" style={{ gap: 10 }} aria-label="Liste des utilisateurs (vue mobile)">
            {rows.map((u) => {
              const rc = roleColors(u.role), sc = statutColors(u.statut)
              return (
                <div key={`m-${u.cjsUid}`} style={{ background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 13, padding: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/admin/utilisateurs/${u.cjsUid}`} style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)', textDecoration: 'none' }}>{u.prenom} {u.nom}</Link>
                      <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2 }}>{regionLabel(u.region)} · {relSeen(u.lastSeenAt)}</div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: rc.bg, color: rc.fg }}>{roleLabel(u.role)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: sc.bg, color: sc.fg }}>{STATUT_LABEL[u.statut] ?? u.statut}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={pagBase} ariaLabel="Pagination" />
          </div>
        )}
      </div>
    </div>
  )
}
