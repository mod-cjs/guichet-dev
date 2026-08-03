'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import type { StatutCandidature, StatutPipeline } from '@prisma/client'
import type { CandidatureRow, CandidaturesFunnel, CandidaturesKpis, SortCand } from '@/lib/loaders/admin-candidatures'
import { CandidatureDetailPanel, type CandidatureDetail } from './CandidatureDetailPanel'
import { chargerCandidatureDetail } from './actions'

export type { CandidatureRow, CandidaturesFunnel, CandidaturesKpis } from '@/lib/loaders/admin-candidatures'

export interface AdminCandidaturesTableProps {
  rows: CandidatureRow[]
  funnel: CandidaturesFunnel
  kpis: CandidaturesKpis
  total: number
  /** Candidatures en attente > 14 j (signal de supervision « à relancer »). */
  bloqueesCount?: number
  currentPage: number
  totalPages: number
  q: string
  statut: string
  etape: string
  sort: SortCand
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const STATUT_LABEL: Record<string, string> = { En_attente: 'En attente', Vue: 'Vue', Retenue: 'Retenue', Refusee: 'Refusée' }
const ETAPE_LABEL: Record<StatutPipeline, string> = { Recue: 'Reçue', Preselection: 'Présélection', Entretien: 'Entretien', Decision: 'Décision' }
function statutColors(s: string): { bg: string; fg: string } {
  switch (s) {
    case 'Retenue': return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
    case 'Refusee': return { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' }
    case 'Vue': return { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
    default: return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
  }
}
function scoreColor(s: number): string { return s >= 75 ? 'var(--gj-green-ink)' : s >= 50 ? 'var(--gj-admin-gold)' : 'var(--gj-red-ink)' }
function initials(prenom: string, nom: string): string { return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase() }
function relativeDate(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return months === 1 ? 'il y a 1 mois' : `il y a ${months} mois`
}

const STATUTS: { value: StatutCandidature; label: string }[] = [
  { value: 'En_attente', label: 'En attente' }, { value: 'Vue', label: 'Vues' },
  { value: 'Retenue', label: 'Retenues' }, { value: 'Refusee', label: 'Refusées' },
]
const ETAPES: { value: StatutPipeline; label: string }[] = [
  { value: 'Recue', label: 'Reçue' }, { value: 'Preselection', label: 'Présélection' },
  { value: 'Entretien', label: 'Entretien' }, { value: 'Decision', label: 'Décision' },
]

// ─── Composant (supervision — lecture seule, la décision = recruteur) ──────────
export function AdminCandidaturesTable({ rows, funnel, kpis, total, bloqueesCount = 0, currentPage, totalPages, q, statut, etape, sort }: AdminCandidaturesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  // Fiche détail (slide-over) — chargée à la demande au clic « Détail ».
  const [detail, setDetail] = useState<CandidatureDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function openDetail(id: string) {
    setLoadingId(id)
    startTransition(async () => {
      try { const d = await chargerCandidatureDetail(id); if (d) setDetail(d) }
      finally { setLoadingId(null) }
    })
  }

  function push(next: Partial<{ q: string; statut: string; etape: string; sort: string }>) {
    const sp = new URLSearchParams()
    const merged = { q, statut, etape, sort, ...next }
    if (merged.q) sp.set('q', merged.q)
    if (merged.statut) sp.set('statut', merged.statut)
    if (merged.etape) sp.set('etape', merged.etape)
    if (merged.sort && merged.sort !== 'recent') sp.set('sort', merged.sort)
    startTransition(() => router.push(sp.toString() ? `${pathname}?${sp}` : pathname))
  }
  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    push({ q: (new FormData(e.currentTarget).get('q')?.toString() ?? '').trim() })
  }

  const exportUrl = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (statut) sp.set('statut', statut)
    if (etape) sp.set('etape', etape)
    const qs = sp.toString()
    return qs ? `/api/admin/candidatures/export?${qs}` : '/api/admin/candidatures/export'
  })()
  const paginationBase = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q); if (statut) sp.set('statut', statut); if (etape) sp.set('etape', etape); if (sort !== 'recent') sp.set('sort', sort)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()

  const FUNNEL_STEPS = [
    { label: 'Reçues', v: funnel.recue },
    { label: 'Présélection', v: funnel.preselection },
    { label: 'Entretien', v: funnel.entretien },
    { label: 'Retenues', v: funnel.retenue, win: true },
  ]

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Candidatures</h1>
            <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
              {total} candidatures · supervision nationale
              {bloqueesCount > 0 && (<> · <span style={{ fontWeight: 800, color: 'var(--gj-red-ink)' }}>{bloqueesCount} à relancer</span></>)}
            </p>
          </div>
        </div>

        {/* ── Funnel + KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 16, marginBottom: 16 }} className="max-md:!grid-cols-1">
          <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)' }}>Parcours des candidatures</div>
                <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 2 }}>Cumul · du dépôt à l&apos;insertion</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)', whiteSpace: 'nowrap' }}>{funnel.conversionPct.toLocaleString('fr-FR')} % conversion</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FUNNEL_STEPS.map((s) => (
                <div key={s.label} style={{ position: 'relative', borderRadius: 9, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', border: s.win ? '1px solid var(--gj-green)' : '1px solid var(--gj-line)', background: 'var(--gj-bg)' }}>
                  <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)' }}>{s.label}</span>
                  <span className="num" style={{ position: 'relative', fontSize: 14, fontWeight: 900, color: s.win ? 'var(--gj-green-ink)' : 'var(--gj-ink)' }}>{s.v.toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
            {[
              { lab: 'En attente', val: kpis.enAttente.toLocaleString('fr-FR'), pill: 'à traiter', tone: 'w' as const },
              { lab: 'Vues', val: kpis.vues.toLocaleString('fr-FR'), pill: 'consultées' },
              { lab: 'Retenues', val: kpis.retenues.toLocaleString('fr-FR'), pill: 'retenues', tone: 'g' as const },
              { lab: 'Score IA moyen', val: `${kpis.scoreMoyen}`, unit: '/100', pill: 'adéquation' },
            ].map((k) => {
              const pillStyle = k.tone === 'w'
                ? { background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }
                : k.tone === 'g'
                  ? { background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }
                  : { background: 'var(--gj-line)', color: 'var(--gj-grey)' }
              return (
                <div key={k.lab} style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: '14px 15px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gj-grey)' }}>{k.lab}</div>
                  <div className="num" style={{ fontSize: 26, fontWeight: 900, margin: '5px 0 6px', color: 'var(--gj-ink)' }}>{k.val}{k.unit && <small style={{ fontSize: 13, color: 'var(--gj-grey)', fontWeight: 700 }}>{k.unit}</small>}</div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, ...pillStyle }}>{k.pill}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Barre d'outils ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <form role="search" onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 13px', minHeight: 42, flex: 1, minWidth: 220 }}>
            <span aria-hidden style={{ color: 'var(--gj-grey)', display: 'inline-flex' }}><Icon name="search" size={16} /></span>
            <input type="search" name="q" placeholder="Rechercher un candidat, une offre, un recruteur… (Entrée)" defaultValue={q} aria-label="Rechercher une candidature" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gj-ink)' }} />
          </form>
          <select aria-label="Filtrer par étape" value={etape} onChange={(e) => push({ etape: e.target.value })} style={{ minHeight: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)', fontSize: 13, fontFamily: 'inherit', padding: '0 12px' }}>
            <option value="">Toutes les étapes</option>
            {ETAPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <a href={exportUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, padding: '0 14px', minHeight: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)', textDecoration: 'none' }}>
            <Icon name="download" size={15} /> Exporter (CDP)
          </a>
        </div>

        {/* ── Chips statut ── */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          <Chip selected={statut === ''} aria-pressed={statut === ''} onClick={() => push({ statut: '' })}>Toutes</Chip>
          {STATUTS.map((s) => (
            <Chip key={s.value} selected={statut === s.value} aria-pressed={statut === s.value} onClick={() => push({ statut: s.value })}>{s.label}</Chip>
          ))}
        </div>

        {/* ── Table (desktop) ── */}
        <div className="hidden md:block" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr .8fr .8fr .8fr .8fr .4fr', gap: 12, padding: '12px 18px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px', minWidth: 860 }}>
            <span>Candidat</span>
            <span>Opportunité</span>
            <span>Soumise</span>
            <span role="columnheader">
              <button type="button" onClick={() => push({ sort: sort === 'score' ? 'recent' : 'score' })} aria-label="Trier par score IA" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, padding: 0, font: 'inherit', color: sort === 'score' ? 'var(--gj-admin-gold)' : 'var(--gj-grey)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.4px', cursor: 'pointer' }}>
                Score IA <Icon name="chevron-down" size={12} />
              </button>
            </span>
            <span role="columnheader">Statut</span>
            <span role="columnheader">Étape</span>
            <span></span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>Aucune candidature trouvée.</div>
          ) : rows.map((c) => {
            const sc = statutColors(c.statut)
            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr .8fr .8fr .8fr .8fr .4fr', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--gj-line)', alignItems: 'center', minWidth: 860 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))', color: 'var(--gj-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{initials(c.candidatPrenom, c.candidatNom)}</span>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/admin/utilisateurs/${c.candidatCjsUid}`} className="hover:underline" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gj-ink)', textDecoration: 'none' }}>{c.candidatPrenom} {c.candidatNom}</Link>
                    <div className="num" style={{ fontSize: 10.5, color: 'var(--gj-grey)', fontFamily: 'ui-monospace, monospace', marginTop: 1 }}>{c.candidatCjsUid}</div>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/admin/opportunites/${c.opportuniteId}/apercu`} className="hover:underline" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{c.opportuniteTitre}</Link>
                  <div style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>{c.recruteur}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{relativeDate(c.soumiseA)}</span>
                  {c.enRetard && (<span title="En attente > 14 j — à relancer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)', width: 'fit-content' }}><Icon name="clock" size={10} /> à relancer</span>)}
                </div>
                <span>
                  {c.score == null
                    ? <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', fontStyle: 'italic' }}>en cours</span>
                    : <span className="num" style={{ fontSize: 14, fontWeight: 900, color: scoreColor(c.score) }}>{c.score}<small style={{ fontSize: 10, color: 'var(--gj-grey)', fontWeight: 700 }}>/100</small></span>}
                </span>
                <span><span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.fg, whiteSpace: 'nowrap' }}>{STATUT_LABEL[c.statut] ?? c.statut}</span></span>
                <span style={{ fontSize: 12, color: 'var(--gj-grey)', fontWeight: 700 }}>{ETAPE_LABEL[c.etape]}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                  {c.favori && <span aria-label="Favori recruteur" title="Favori recruteur" style={{ color: 'var(--gj-admin-gold)' }}><Icon name="bookmark" size={15} /></span>}
                  <button type="button" onClick={() => openDetail(c.id)} disabled={loadingId === c.id} aria-label={`Détail de ${c.candidatPrenom} ${c.candidatNom}`} style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gj-admin-gold)', background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'nowrap', opacity: loadingId === c.id ? 0.5 : 1 }}>{loadingId === c.id ? '…' : 'Détail ›'}</button>
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Cartes mobiles ── */}
        {rows.length === 0 ? (
          <div className="md:hidden" style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14 }}>Aucune candidature trouvée.</div>
        ) : (
          <div className="md:hidden flex flex-col" style={{ gap: 10 }} aria-label="Liste des candidatures (vue mobile)">
            {rows.map((c) => {
              const sc = statutColors(c.statut)
              return (
                <div key={`m-${c.id}`} style={{ background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 13, padding: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))', color: 'var(--gj-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{initials(c.candidatPrenom, c.candidatNom)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/admin/utilisateurs/${c.candidatCjsUid}`} className="hover:underline" style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)', textDecoration: 'none' }}>{c.candidatPrenom} {c.candidatNom}</Link>
                      <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {ETAPE_LABEL[c.etape]}
                        {c.favori && <span aria-label="Favori recruteur" style={{ color: 'var(--gj-admin-gold)' }}><Icon name="bookmark" size={12} /></span>}
                        {c.enRetard && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)' }}><Icon name="clock" size={10} /> à relancer</span>)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: sc.bg, color: sc.fg, whiteSpace: 'nowrap' }}>{STATUT_LABEL[c.statut] ?? c.statut}</span>
                      <div className="num" style={{ fontSize: 12.5, fontWeight: 900, marginTop: 4, color: c.score == null ? 'var(--gj-grey)' : scoreColor(c.score) }}>{c.score == null ? 'en cours' : `${c.score}/100`}</div>
                    </div>
                  </div>
                  <Link href={`/admin/opportunites/${c.opportuniteId}/apercu`} className="hover:underline" style={{ display: 'block', marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'var(--gj-ink)', textDecoration: 'none' }}>{c.opportuniteTitre}<span style={{ fontWeight: 400, color: 'var(--gj-grey)' }}> · {c.recruteur}</span></Link>
                  <button type="button" onClick={() => openDetail(c.id)} disabled={loadingId === c.id} aria-label={`Détail de ${c.candidatPrenom} ${c.candidatNom}`} style={{ marginTop: 9, fontSize: 12, fontWeight: 800, color: 'var(--gj-admin-gold)', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>{loadingId === c.id ? 'Chargement…' : 'Voir le détail ›'}</button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={paginationBase} ariaLabel="Pagination" />
          </div>
        )}
      </div>

      {/* ── Fiche détail (slide-over) ── */}
      {detail && <CandidatureDetailPanel detail={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
