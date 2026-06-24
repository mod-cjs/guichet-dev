'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import type { StatutCandidature } from '@prisma/client'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CandidatureRow {
  id: string
  candidatPrenom: string
  candidatNom: string
  opportuniteTitre: string
  organisation: string
  statut: StatutCandidature
  soumiseA: Date
  /** En attente depuis trop longtemps (le recruteur n'a pas traité) → à relancer. */
  enRetard: boolean
}

export interface StatutCount {
  statut: string
  _count: { id: number }
}

export interface AdminCandidaturesTableProps {
  rows: CandidatureRow[]
  statutCounts: StatutCount[]
  total: number
  /** Taux de placement (% de candidatures Retenue) — KPI YEAH */
  tauxPlacement: number
  /** Nombre de candidatures en attente bloquées (non traitées par le recruteur). */
  bloqueesCount: number
  currentPage: number
  totalPages: number
  q: string
  statut: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const STATUT_LABEL: Record<string, string> = {
  En_attente: 'En attente',
  Vue: 'Vue',
  Retenue: 'Retenue',
  Refusee: 'Refusée',
}
function statutLabel(s: string): string {
  return STATUT_LABEL[s] ?? s
}
function statutColors(s: string): { bg: string; fg: string } {
  switch (s) {
    case 'Retenue': return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
    case 'Refusee': return { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' }
    case 'Vue':     return { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
    default:        return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
  }
}

function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}

function relativeDate(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return months === 1 ? 'il y a 1 mois' : `il y a ${months} mois`
}

// ─── Composant principal (supervision — lecture seule, la décision = recruteur) ─

export function AdminCandidaturesTable({
  rows,
  statutCounts,
  total,
  tauxPlacement,
  bloqueesCount,
  currentPage,
  totalPages,
  q,
  statut,
}: AdminCandidaturesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function pushWith(nextQ: string, nextStatut: string) {
    const sp = new URLSearchParams()
    if (nextQ) sp.set('q', nextQ)
    if (nextStatut) sp.set('statut', nextStatut)
    router.push(sp.toString() ? `${pathname}?${sp}` : pathname)
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = (new FormData(e.currentTarget).get('q')?.toString() ?? '').trim()
    startTransition(() => pushWith(value, statut))
  }

  function handleStatut(value: string) {
    startTransition(() => pushWith(q, value))
  }

  const STATUTS = [
    { value: 'En_attente', label: 'En attente' },
    { value: 'Vue', label: 'Vue' },
    { value: 'Retenue', label: 'Retenue' },
    { value: 'Refusee', label: 'Refusée' },
  ]
  const TOUS_TOTAL = statutCounts.reduce((acc, s) => acc + s._count.id, 0)

  // URL d'export CSV (respecte les filtres courants).
  const exportUrl = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (statut) sp.set('statut', statut)
    const qs = sp.toString()
    return qs ? `/api/admin/candidatures/export?${qs}` : '/api/admin/candidatures/export'
  })()

  const paginationBase = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (statut) sp.set('statut', statut)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Candidatures</h1>
            <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
              {total} candidatures ·{' '}
              <span style={{ fontWeight: 800, color: 'var(--gj-green-ink)' }}>
                Taux de placement {tauxPlacement}&nbsp;%
              </span>
              {bloqueesCount > 0 && (
                <>
                  {' · '}
                  <span style={{ fontWeight: 800, color: 'var(--gj-red-ink)' }}>
                    {bloqueesCount} à relancer
                  </span>
                </>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={exportUrl}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, padding: '0 14px', minHeight: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)', textDecoration: 'none' }}
            >
              <Icon name="download" size={15} />
              Exporter (CSV)
            </a>

            <form
              role="search"
              onSubmit={handleSearchSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 13px', minHeight: 42, width: 260 }}
            >
              <span aria-hidden style={{ color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                name="q"
                placeholder="Candidat ou opportunité… (Entrée)"
                defaultValue={q}
                aria-label="Rechercher une candidature"
                style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gj-ink)' }}
              />
              <button type="submit" aria-label="Lancer la recherche" style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
                <Icon name="arrow-right" size={15} style={{ color: 'var(--gj-grey)' }} />
              </button>
            </form>
          </div>
        </div>

        {/* ── Chips filtre statut ── */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          <Chip selected={statut === ''} aria-pressed={statut === ''} onClick={() => handleStatut('')}>
            Tous ({TOUS_TOTAL})
          </Chip>
          {STATUTS.map((s) => {
            const count = statutCounts.find((sc) => sc.statut === s.value)?._count.id ?? 0
            return (
              <Chip key={s.value} selected={statut === s.value} aria-pressed={statut === s.value} onClick={() => handleStatut(s.value)}>
                {s.label} ({count})
              </Chip>
            )
          })}
        </div>

        {/* ── Table ── */}
        <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.8fr 1fr 1.2fr', gap: 14, padding: '12px 18px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}
            className="hidden md:grid"
          >
            <span>Candidat</span>
            <span>Opportunité</span>
            <span>Statut</span>
            <span>Soumise</span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
              Aucune candidature trouvée.
            </div>
          ) : (
            rows.map((c) => {
              const sc = statutColors(c.statut)
              return (
                <div
                  key={c.id}
                  style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.8fr 1fr 1.2fr', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--gj-line)', alignItems: 'center' }}
                  className="!grid grid-cols-1 md:!grid-cols-[1.6fr_1.8fr_1fr_1.2fr]"
                >
                  {/* Candidat */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))', color: 'var(--gj-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                      {initials(c.candidatPrenom, c.candidatNom)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gj-ink)' }}>
                        {c.candidatPrenom} {c.candidatNom}
                      </div>
                    </div>
                  </div>

                  {/* Opportunité */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.opportuniteTitre}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>{c.organisation}</div>
                  </div>

                  {/* Statut */}
                  <span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.fg, whiteSpace: 'nowrap' }}>
                      {statutLabel(c.statut)}
                    </span>
                  </span>

                  {/* Soumise + flag à relancer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{relativeDate(c.soumiseA)}</span>
                    {c.enRetard && (
                      <span
                        title="En attente depuis plus de 14 jours — à relancer auprès du recruteur"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)' }}
                      >
                        <Icon name="clock" size={11} />
                        À relancer
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={paginationBase} ariaLabel="Pagination" />
          </div>
        )}
      </div>
    </div>
  )
}
