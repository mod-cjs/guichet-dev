'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import { intentLabel } from '@/lib/ia/tool-labels'
import type { CanalAgent } from '@prisma/client'

// ─── Types (sérialisables — `debut` en ISO string) ──────────────────────────

export interface SessionRowDTO {
  sessionId: string
  canal: CanalAgent
  cjsUid: string | null
  role: string | null
  centreId: string | null
  /** Nom du centre résolu (jamais le cuid brut) — « — » si centre inconnu, null si aucun centre. */
  centreNom: string | null
  debut: string
  dureeMs: number
  nbTours: number
  nbEvents: number
  outilPrincipal: string | null
  hasErreur: boolean
  hasEscalade: boolean
  user: { prenom: string; nom: string } | null
  yqs: number | null
  drapeauRouge: boolean
  resolu: boolean
  converti: boolean
  feedback: number
}

export interface SessionsClientProps {
  rows: SessionRowDTO[]
  summary: { sessions: number; escalades: number; erreurs: number }
  total: number
  currentPage: number
  totalPages: number
  centres: { id: string; nom: string }[]
  roles: string[]
  filtres: { from: string; to: string; canal: string; q: string; filtre: string; role: string; centre: string }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuree(ms: number): string {
  if (ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m} min ${r} s` : `${m} min`
}

function formatHeure(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function canalBadge(c: CanalAgent): { label: string; icon: 'whatsapp' | 'desktop'; bg: string; fg: string } {
  return c === 'whatsapp'
    ? { label: 'WhatsApp', icon: 'whatsapp', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
    : { label: 'Web', icon: 'desktop', bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
}

/** Nom affichable du bénéficiaire (cjs_uid désormais autorisé, pas d'anonymisation admin). */
function userLabel(r: SessionRowDTO): string {
  if (r.user) return `${r.user.prenom} ${r.user.nom}`.trim() || 'Bénéficiaire'
  if (r.cjsUid) return `${r.cjsUid.slice(0, 8)}…`
  return 'Anonyme'
}

const GRID = '1.5fr 0.9fr 1.3fr 0.7fr 0.7fr 1fr'

const selectStyle: React.CSSProperties = {
  background: 'var(--gj-surface)',
  border: '1.5px solid var(--gj-line)',
  borderRadius: 10,
  padding: '0 10px',
  minHeight: 44,
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--gj-ink)',
  cursor: 'pointer',
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function SessionsClient({
  rows,
  summary,
  total,
  currentPage,
  totalPages,
  centres,
  roles,
  filtres,
}: SessionsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function buildQs(next: Partial<typeof filtres> & { page?: string }): string {
    const merged = { ...filtres, page: '1', ...next }
    const sp = new URLSearchParams()
    if (merged.from) sp.set('from', merged.from)
    if (merged.to) sp.set('to', merged.to)
    if (merged.canal && merged.canal !== 'tous') sp.set('canal', merged.canal)
    if (merged.q) sp.set('q', merged.q)
    if (merged.filtre) sp.set('filtre', merged.filtre)
    if (merged.role) sp.set('role', merged.role)
    if (merged.centre) sp.set('centre', merged.centre)
    if (merged.page && merged.page !== '1') sp.set('page', merged.page)
    return sp.toString()
  }

  function push(next: Partial<typeof filtres> & { page?: string }) {
    const qs = buildQs(next)
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = (new FormData(e.currentTarget).get('q')?.toString() ?? '').trim()
    push({ q: value })
  }

  function handleDates(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    push({ from: fd.get('from')?.toString() ?? '', to: fd.get('to')?.toString() ?? '' })
  }

  const paginationBase = (() => {
    const qs = buildQs({})
    return qs ? `${pathname}?${qs}` : pathname
  })()

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Sessions Yaye</h1>
            <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
              {summary.sessions} sessions ·{' '}
              <span style={{ fontWeight: 800, color: 'var(--gj-yellow-ink)' }}>
                {summary.escalades} escalade{summary.escalades > 1 ? 's' : ''}
              </span>
              {' · '}
              <span style={{ fontWeight: 800, color: 'var(--gj-red-ink)' }}>
                {summary.erreurs} avec erreur
              </span>
            </p>
          </div>
          <Link
            href="/admin/analytics/yaye"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: 'var(--gj-teal-deep)', textDecoration: 'none', padding: '9px 12px', borderRadius: 9, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)' }}
          >
            <Icon name="chart" size={14} />
            Voir les analytics
          </Link>
        </div>

        {/* ── Barre de filtres ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {/* Dates */}
          <form onSubmit={handleDates} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 10px', minHeight: 44 }}>
            <input type="date" name="from" defaultValue={filtres.from} aria-label="Du" style={{ border: 0, outline: 0, background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--gj-ink)' }} />
            <span aria-hidden style={{ color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center' }}>
              <Icon name="arrow-right" size={13} />
            </span>
            <input type="date" name="to" defaultValue={filtres.to} aria-label="Au" style={{ border: 0, outline: 0, background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--gj-ink)' }} />
            <button
              type="submit"
              aria-label="Appliquer les dates"
              style={{
                border: 0, background: 'transparent', cursor: 'pointer', padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 44, minWidth: 44, color: 'var(--gj-grey)',
              }}
            >
              <Icon name="arrow-right" size={15} />
            </button>
          </form>

          {/* Rôle */}
          <select
            value={filtres.role}
            onChange={(e) => push({ role: e.target.value })}
            aria-label="Filtrer par rôle"
            style={selectStyle}
          >
            <option value="">Tous rôles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Centre */}
          <select
            value={filtres.centre}
            onChange={(e) => push({ centre: e.target.value })}
            aria-label="Filtrer par centre"
            style={selectStyle}
          >
            <option value="">Tous centres</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>

          {/* Recherche */}
          <form role="search" onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 13px', minHeight: 42, width: 260 }}>
            <span aria-hidden style={{ color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <Icon name="search" size={16} />
            </span>
            <input type="search" name="q" placeholder="cjs_uid ou session… (Entrée)" defaultValue={filtres.q} aria-label="Rechercher une session" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gj-ink)' }} />
          </form>
        </div>

        {/* ── Chips canal + état ── */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          <Chip selected={filtres.canal === 'tous'} aria-pressed={filtres.canal === 'tous'} onClick={() => push({ canal: 'tous' })}>Tous canaux</Chip>
          <Chip selected={filtres.canal === 'web'} aria-pressed={filtres.canal === 'web'} icon="desktop" onClick={() => push({ canal: 'web' })}>Web</Chip>
          <Chip selected={filtres.canal === 'whatsapp'} aria-pressed={filtres.canal === 'whatsapp'} icon="whatsapp" onClick={() => push({ canal: 'whatsapp' })}>WhatsApp</Chip>
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--gj-line)', margin: '0 4px' }} aria-hidden />
          <Chip selected={filtres.filtre === 'escalade'} aria-pressed={filtres.filtre === 'escalade'} icon="bell" onClick={() => push({ filtre: filtres.filtre === 'escalade' ? '' : 'escalade' })}>Escaladées</Chip>
          <Chip selected={filtres.filtre === 'erreur'} aria-pressed={filtres.filtre === 'erreur'} icon="alert" onClick={() => push({ filtre: filtres.filtre === 'erreur' ? '' : 'erreur' })}>Avec erreur</Chip>
          <Chip selected={filtres.filtre === 'drapeau'} aria-pressed={filtres.filtre === 'drapeau'} icon="flame" onClick={() => push({ filtre: filtres.filtre === 'drapeau' ? '' : 'drapeau' })}>Drapeau rouge</Chip>
        </div>

        {/* ── Table ── */}
        <div
          data-testid="sessions-table"
          aria-busy={isPending}
          style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden', opacity: isPending ? 0.6 : 1, transition: 'opacity .15s ease' }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 11.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}
            className="hidden md:grid"
          >
            <span>Utilisateur</span>
            <span>Canal</span>
            <span>Outil principal</span>
            <span>Tours</span>
            <span>Durée</span>
            <span>Début / état</span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
              Aucune session sur cette période.
            </div>
          ) : (
            rows.map((s) => {
              const cb = canalBadge(s.canal)
              return (
                <Link
                  key={s.sessionId}
                  href={`/admin/yaye/sessions/${s.sessionId}`}
                  style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--gj-line)', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                  className="!grid grid-cols-1 md:!grid-cols-[1.5fr_0.9fr_1.3fr_0.7fr_0.7fr_1fr] hover:bg-gj-bg"
                >
                  {/* Utilisateur */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userLabel(s)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.role ?? '—'}{s.centreNom ? ` · ${s.centreNom}` : ''} · {s.nbEvents} échange{s.nbEvents > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Canal */}
                  <span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: cb.bg, color: cb.fg }}>
                      <Icon name={cb.icon} size={12} />
                      {cb.label}
                    </span>
                  </span>

                  {/* Outil principal (libellé métier) */}
                  <div style={{ fontSize: 12.5, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {intentLabel(s.outilPrincipal)}
                  </div>

                  {/* Tours */}
                  <span style={{ fontSize: 13, color: 'var(--gj-ink)', fontWeight: 700 }}>{s.nbTours}</span>

                  {/* Durée */}
                  <span style={{ fontSize: 12.5, color: 'var(--gj-grey)' }}>{formatDuree(s.dureeMs)}</span>

                  {/* Début + état + qualité/résultat */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{formatHeure(s.debut)}</span>
                    {s.yqs != null && (
                      <span title="Yaye Quality Score" style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: s.yqs >= 70 ? 'var(--gj-green-soft)' : s.yqs >= 50 ? 'var(--gj-yellow-soft)' : 'var(--gj-red-soft)', color: s.yqs >= 70 ? 'var(--gj-green-ink)' : s.yqs >= 50 ? 'var(--gj-yellow-ink)' : 'var(--gj-red-ink)' }}>
                        {Math.round(s.yqs)}
                      </span>
                    )}
                    {s.drapeauRouge && (
                      <span title="Drapeau rouge qualité (hallucination / CDP)" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)' }}>
                        <Icon name="flame" size={10} />
                      </span>
                    )}
                    {s.converti && (
                      <span title="A produit une action métier (candidature / réservation)" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}>
                        <Icon name="check-circle" size={10} />
                      </span>
                    )}
                    {s.feedback !== 0 && (
                      <span title={`Retour utilisateur : ${s.feedback > 0 ? 'positif' : 'négatif'}`} style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: s.feedback > 0 ? 'var(--gj-green-soft)' : 'var(--gj-red-soft)', color: s.feedback > 0 ? 'var(--gj-green-ink)' : 'var(--gj-red-ink)' }}>
                        {s.feedback > 0 ? 'avis +' : 'avis −'}
                      </span>
                    )}
                    {s.hasEscalade && (
                      <span title="Escalade conseiller" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
                        <Icon name="bell" size={10} />
                      </span>
                    )}
                    {s.hasErreur && (
                      <span title="Erreur durant la session" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)' }}>
                        <Icon name="alert" size={10} />
                      </span>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={paginationBase} ariaLabel="Pagination des sessions" />
          </div>
        )}

        <p style={{ marginTop: 16, fontSize: 11.5, color: 'var(--gj-grey)', textAlign: 'center' }}>
          {total} session{total > 1 ? 's' : ''} · trace technique consultable en cliquant une ligne
        </p>
      </div>
    </div>
  )
}
