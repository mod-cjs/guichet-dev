'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import type { CanalAgent, StatutEscalade } from '@prisma/client'

// ─── Types (sérialisables) ──────────────────────────────────────────────────

export interface EscaladeRowDTO {
  id: string
  sessionId: string
  cjsUid: string | null
  role: string | null
  centreId: string | null
  canal: CanalAgent
  raison: string | null
  stade: string | null
  signalDanger: string | null
  statut: StatutEscalade
  traitePar: string | null
  traiteA: string | null
  createdAt: string
  user: { prenom: string; nom: string; telephone: string | null } | null
}

export interface EscaladesClientProps {
  rows: EscaladeRowDTO[]
  counts: Record<StatutEscalade, number>
  total: number
  currentPage: number
  totalPages: number
  centres: { id: string; nom: string }[]
  filtres: { statut: string; canal: string; centre: string; danger: boolean }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUT_META: Record<StatutEscalade, { label: string; bg: string; fg: string }> = {
  en_attente:      { label: 'En attente',     bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  prise_en_charge: { label: 'Prise en charge', bg: 'var(--gj-blue-soft)',   fg: 'var(--gj-blue-ink)' },
  resolue:         { label: 'Résolue',          bg: 'var(--gj-green-soft)',  fg: 'var(--gj-green-ink)' },
}

const STATUT_ORDER: StatutEscalade[] = ['en_attente', 'prise_en_charge', 'resolue']

function relative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}

function canalLabel(c: CanalAgent): string {
  return c === 'whatsapp' ? 'WhatsApp' : 'Web'
}

/** Nom affichable du bénéficiaire (fallback cjs_uid court, puis « Anonyme »). */
function userLabel(row: EscaladeRowDTO): string {
  if (row.user) return `${row.user.prenom} ${row.user.nom}`.trim() || 'Bénéficiaire'
  if (row.cjsUid) return `${row.cjsUid.slice(0, 8)}…`
  return 'Anonyme'
}

const GRID = '1.3fr 1.6fr 1fr 1fr 1.4fr'

// ─── Composant ──────────────────────────────────────────────────────────────

export function EscaladesClient({ rows, counts, total, currentPage, totalPages, centres, filtres }: EscaladesClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  function push(next: Partial<typeof filtres>) {
    const merged = { ...filtres, ...next }
    const sp = new URLSearchParams()
    if (merged.statut) sp.set('statut', merged.statut)
    if (merged.canal && merged.canal !== 'tous') sp.set('canal', merged.canal)
    if (merged.centre) sp.set('centre', merged.centre)
    if (merged.danger) sp.set('danger', '1')
    const qs = sp.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  async function changeStatut(id: string, statut: StatutEscalade) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/yaye/escalades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      if (res.ok) startTransition(() => router.refresh())
    } finally {
      setBusy(null)
    }
  }

  const paginationBase = (() => {
    const sp = new URLSearchParams()
    if (filtres.statut) sp.set('statut', filtres.statut)
    if (filtres.canal !== 'tous') sp.set('canal', filtres.canal)
    if (filtres.centre) sp.set('centre', filtres.centre)
    if (filtres.danger) sp.set('danger', '1')
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()

  const totalAll = STATUT_ORDER.reduce((a, s) => a + counts[s], 0)

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Escalades Yaye</h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
            Conversations passées la main à un conseiller humain ·{' '}
            <span style={{ fontWeight: 800, color: 'var(--gj-yellow-ink)' }}>{counts.en_attente} en attente</span>
          </p>
        </div>

        {/* ── Chips statut ── */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          <Chip selected={filtres.statut === ''} aria-pressed={filtres.statut === ''} onClick={() => push({ statut: '' })}>
            Toutes ({totalAll})
          </Chip>
          {STATUT_ORDER.map((s) => (
            <Chip key={s} selected={filtres.statut === s} aria-pressed={filtres.statut === s} onClick={() => push({ statut: filtres.statut === s ? '' : s })}>
              {STATUT_META[s].label} ({counts[s]})
            </Chip>
          ))}
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--gj-line)', margin: '0 4px' }} aria-hidden />
          <Chip selected={filtres.danger} aria-pressed={filtres.danger} icon="alert" onClick={() => push({ danger: !filtres.danger })}>Danger</Chip>
          <Chip selected={filtres.canal === 'web'} aria-pressed={filtres.canal === 'web'} icon="desktop" onClick={() => push({ canal: filtres.canal === 'web' ? 'tous' : 'web' })}>Web</Chip>
          <Chip selected={filtres.canal === 'whatsapp'} aria-pressed={filtres.canal === 'whatsapp'} icon="whatsapp" onClick={() => push({ canal: filtres.canal === 'whatsapp' ? 'tous' : 'whatsapp' })}>WhatsApp</Chip>
          <select
            value={filtres.centre}
            onChange={(e) => push({ centre: e.target.value })}
            aria-label="Filtrer par centre"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 10px', minHeight: 36, fontSize: 13, fontFamily: 'inherit', color: 'var(--gj-ink)', cursor: 'pointer' }}
          >
            <option value="">Tous centres</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        {/* ── Table ── */}
        <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }} className="hidden md:grid">
            <span>Utilisateur</span>
            <span>Raison / stade</span>
            <span>Signalée</span>
            <span>Statut</span>
            <span>Action</span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
              Aucune escalade {filtres.statut ? `« ${STATUT_META[filtres.statut as StatutEscalade]?.label} »` : ''}.
            </div>
          ) : (
            rows.map((e) => {
              const sm = STATUT_META[e.statut]
              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--gj-line)', alignItems: 'center' }} className="!grid grid-cols-1 md:!grid-cols-[1.3fr_1.6fr_1fr_1fr_1.4fr]">
                  {/* Utilisateur + contact (essentiel sur un signalement de danger) */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userLabel(e)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
                      {canalLabel(e.canal)}{e.centreId ? ` · ${e.centreId}` : ''}
                    </div>
                    {e.cjsUid && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        <Link href={`/admin/utilisateurs/${e.cjsUid}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--gj-teal-deep)', textDecoration: 'none' }}>
                          <Icon name="user" size={11} /> Fiche
                        </Link>
                        {e.user?.telephone && (
                          <a href={`tel:${e.user.telephone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--gj-teal-deep)', textDecoration: 'none' }}>
                            <Icon name="phone" size={11} /> {e.user.telephone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Raison / stade (+ badge DANGER prioritaire) */}
                  <div style={{ minWidth: 0 }}>
                    {e.signalDanger && (
                      <span
                        style={{
                          display: 'inline-block', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '.4px', color: 'var(--gj-surface)', background: 'var(--gj-red)',
                          borderRadius: 999, padding: '1px 8px', marginBottom: 3,
                        }}
                      >
                        Danger · {e.signalDanger}
                      </span>
                    )}
                    <div style={{ fontSize: 12.5, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.raison ?? '—'}</div>
                    {e.stade && <div style={{ fontSize: 11, color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.stade}</div>}
                  </div>

                  {/* Signalée */}
                  <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{relative(e.createdAt)}</span>

                  {/* Statut + qui traite / depuis quand (suivi SLA) */}
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: sm.bg, color: sm.fg, whiteSpace: 'nowrap' }}>{sm.label}</span>
                    {e.statut !== 'en_attente' && e.traitePar && (
                      <div style={{ fontSize: 10.5, color: 'var(--gj-grey)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        par {e.traitePar.slice(0, 8)}…{e.traiteA ? ` · ${relative(e.traiteA)}` : ''}
                      </div>
                    )}
                    {e.statut === 'en_attente' && e.signalDanger && (
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gj-red-ink)', marginTop: 4 }}>
                        en attente {relative(e.createdAt)}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {e.statut === 'en_attente' && (
                      <ActionBtn busy={busy === e.id} onClick={() => changeStatut(e.id, 'prise_en_charge')} icon="check" label="Prendre en charge" />
                    )}
                    {e.statut === 'prise_en_charge' && (
                      <ActionBtn busy={busy === e.id} onClick={() => changeStatut(e.id, 'resolue')} icon="check-circle" label="Marquer résolue" tone="green" />
                    )}
                    {e.statut === 'resolue' && (
                      <ActionBtn busy={busy === e.id} onClick={() => changeStatut(e.id, 'en_attente')} icon="arrow-up" label="Rouvrir" tone="muted" />
                    )}
                    <Link href={`/admin/yaye/sessions/${e.sessionId}`} title="Voir la session" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: 'var(--gj-teal-deep)', textDecoration: 'none', padding: '6px 8px' }}>
                      <Icon name="external" size={13} />
                      Session
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={paginationBase} ariaLabel="Pagination des escalades" />
          </div>
        )}

        <p style={{ marginTop: 16, fontSize: 11.5, color: 'var(--gj-grey)', textAlign: 'center' }}>
          {total} escalade{total > 1 ? 's' : ''} · le staff du centre est notifié à chaque escalade
        </p>
      </div>
    </div>
  )
}

function ActionBtn({ busy, onClick, icon, label, tone }: { busy: boolean; onClick: () => void; icon: 'check' | 'check-circle' | 'arrow-up'; label: string; tone?: 'green' | 'muted' }) {
  const colors =
    tone === 'green'
      ? { bg: 'var(--gj-green)', fg: 'var(--gj-surface)', border: 'transparent' }
      : tone === 'muted'
        ? { bg: 'var(--gj-surface)', fg: 'var(--gj-grey)', border: 'var(--gj-line)' }
        : { bg: 'var(--gj-teal)', fg: 'var(--gj-surface)', border: 'transparent' }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800,
        padding: '7px 11px', borderRadius: 9, cursor: busy ? 'default' : 'pointer',
        background: colors.bg, color: colors.fg, border: `1.5px solid ${colors.border}`,
        opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
      }}
    >
      <Icon name={icon} size={13} />
      {label}
    </button>
  )
}
