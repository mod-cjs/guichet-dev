'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import { CentresMapGoogle } from '@/components/centres/CentresMapGoogle'
import { DashboardFilterBar } from './DashboardFilterBar'
import { regionLabel } from '@/lib/regions'
import { periodeLabel } from '@/lib/dashboard-filters'
import type { DashboardFilters } from '@/lib/dashboard-filters'
import type { AdminDashboardData, BriefingItem, FunnelStep } from '@/lib/loaders/admin-dashboard'

// ── Tokens de ton (aplats, theme-aware — ZÉRO gradient) ──────────────────────
const TONE: Record<'crit' | 'warn' | 'info', { soft: string; ink: string }> = {
  crit: { soft: 'var(--gj-red-soft)', ink: 'var(--gj-red)' },
  warn: { soft: 'var(--gj-yellow-soft)', ink: 'var(--gj-yellow-ink)' },
  info: { soft: 'var(--gj-blue-soft)', ink: 'var(--gj-blue-ink)' },
}
const BRIEF_ICON: Record<BriefingItem['key'], IconName> = { moderation: 'shield', escalades: 'alert', curation: 'check-circle' }
const BRIEF_LABEL: Record<BriefingItem['key'], string> = { moderation: 'Modération', escalades: 'Escalades Yaye', curation: 'Curation' }

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 15, boxShadow: 'var(--gj-edge)' }
const h2: CSSProperties = { fontSize: 15, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }
const eyebrow: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }

function Sub({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 2 }}>{children}</div>
}
function iconBadge(name: IconName, soft: string, ink: string, size = 26) {
  return <span style={{ display: 'inline-grid', placeItems: 'center', width: size, height: size, borderRadius: 8, background: soft, color: ink, boxShadow: 'var(--gj-edge)', flexShrink: 0 }}><Icon name={name} size={size <= 26 ? 15 : 17} /></span>
}

// ── Briefing (héros task-first, compact) ─────────────────────────────────────
function Briefing({ items }: { items: BriefingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="gj-registre-card" style={{ ...card, padding: 15, display: 'flex', alignItems: 'center', gap: 12 }}>
        {iconBadge('check-circle', 'var(--gj-green-soft)', 'var(--gj-green-ink)', 34)}
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--gj-ink)' }}>Rien ne requiert ton attention.</div>
          <Sub>Modération, escalades et curation sont à jour.</Sub>
        </div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
      {items.map((b) => {
        const t = TONE[b.tone]
        return (
          <Link key={b.key} href={b.href} className="gj-registre-card is-interactive" style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 7, textDecoration: 'none', color: 'inherit', borderColor: b.tone === 'crit' ? 'var(--gj-red)' : 'var(--gj-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {iconBadge(BRIEF_ICON[b.key], t.soft, t.ink)}
              <span style={{ ...eyebrow, color: t.ink, flex: 1 }}>{BRIEF_LABEL[b.key]}</span>
              <b style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{b.count}</b>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gj-grey)', lineHeight: 1.4 }}>{b.context}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: t.ink, marginTop: 2, paddingTop: 9, borderTop: '1px solid var(--gj-line)' }}>
              {b.cta} <Icon name="arrow-right" size={14} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Funnel (héros mission) ───────────────────────────────────────────────────
const STEP_HREF: Record<string, string> = {
  recue: '/admin/candidatures', preselection: '/admin/candidatures?etape=preselection',
  entretien: '/admin/candidatures?etape=entretien', retenue: '/admin/candidatures?statut=retenue', insertion: '/admin/candidatures?statut=retenue',
}
function Funnel({ steps, conversion }: { steps: FunnelStep[]; conversion: number }) {
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }}>
        <h2 style={h2}>Parcours des candidatures</h2>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gj-teal-deep)' }}>{conversion}% du dépôt à l&apos;insertion</span>
      </div>
      <Sub>Le taux de conversion à chaque étape révèle où le parcours se perd.</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 13 }}>
        {steps.map((s) => (
          <Link key={s.key} href={STEP_HREF[s.key] ?? '/admin/candidatures'} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)' }}>
                {s.label}
                {s.dropoff && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 7px', borderRadius: 999, background: 'var(--gj-red-soft)', color: 'var(--gj-red)' }}>
                    <Icon name="alert" size={11} /> point de fuite
                  </span>
                )}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {s.conversion !== null && <span style={{ fontSize: 11.5, fontWeight: 700, color: s.dropoff ? 'var(--gj-red)' : 'var(--gj-grey)' }}>{Math.round(s.conversion * 100)}%</span>}
                <b style={{ fontSize: 14, fontWeight: 900, color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{s.count.toLocaleString('fr-FR')}</b>
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--gj-bg)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(3, s.pctOfTop * 100)}%`, height: '100%', borderRadius: 6, background: s.dropoff ? 'var(--gj-red)' : s.key === 'insertion' ? 'var(--gj-green-ink)' : 'var(--gj-teal-deep)' }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── KPIs 2×2 (rail, compact) ─────────────────────────────────────────────────
const KPI_ICON: Record<string, IconName> = { jeunes: 'users', offres: 'employment', insertions: 'trending', partenaires: 'engagement' }
function Kpis({ kpis }: { kpis: AdminDashboardData['kpis'] }) {
  return (
    <div className="grid grid-cols-2 gap-[12px]">
      {kpis.map((k) => (
        <div key={k.key} className="gj-registre-card" style={{ ...card, padding: 13 }}>
          {iconBadge(KPI_ICON[k.key] ?? 'chart', 'var(--gj-teal-soft)', 'var(--gj-teal-deep)', 28)}
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)', marginTop: 8, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
          <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 4 }}>{k.label}</div>
          {k.delta && <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: k.deltaUp ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>{k.delta}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Réseau — centres à suivre (liste seule) ──────────────────────────────────
function ReseauList({ centres }: { centres: AdminDashboardData['centres'] }) {
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 18 }}>
      <h2 style={h2}>Réseau — centres à suivre</h2>
      <Sub>Classés par réservations en attente puis fréquentation (30 j).</Sub>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
        {centres.map((c) => (
          <Link key={c.id} href="/admin/centres" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--gj-line)', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)' }}>{c.nom}</div>
              <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 1 }}>{c.jeunes.toLocaleString('fr-FR')} jeunes · {c.insertions} insertions</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {c.reservationsEnAttente > 0 && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>{c.reservationsEnAttente} rés. en attente</span>}
              <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>{c.frequentation30j} visites</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Carte compacte (rail) ────────────────────────────────────────────────────
function MapCard({ geo }: { geo: AdminDashboardData['centresGeo'] }) {
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={h2}>Présence nationale</h2>
        <span style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>{geo.length} centres</span>
      </div>
      <CentresMapGoogle centres={geo.map((c) => ({ id: c.id, nom: c.nom, latitude: c.latitude, longitude: c.longitude }))} centresForList={geo.map((c) => ({ id: c.id, nom: c.nom, region: c.region, slug: c.slug }))} height={190} zoom={6} disableUI />
    </div>
  )
}

// ── Yaye (rail, compact) ─────────────────────────────────────────────────────
function YayeBlock({ y }: { y: AdminDashboardData['yaye'] }) {
  const metrics = [
    { label: 'Auto-résolution', value: y.autoResolution != null ? `${y.autoResolution}%` : '—', good: (y.autoResolution ?? 0) >= 70 },
    { label: 'Satisfaction', value: y.satisfaction != null ? `${y.satisfaction}%` : '—', good: (y.satisfaction ?? 0) >= 70 },
    { label: 'Sessions', value: y.sessions.toLocaleString('fr-FR') },
    { label: 'Actions générées', value: y.conversations.toLocaleString('fr-FR') },
  ]
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={h2}>Assistant Yaye</h2>
        {y.escaladesOuvertes > 0 ? (
          <Link href="/admin/yaye/escalades" style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: y.escaladesDanger > 0 ? 'var(--gj-red-soft)' : 'var(--gj-yellow-soft)', color: y.escaladesDanger > 0 ? 'var(--gj-red)' : 'var(--gj-yellow-ink)', textDecoration: 'none' }}>
            {y.escaladesOuvertes} escalade{y.escaladesOuvertes > 1 ? 's' : ''}{y.escaladesDanger > 0 ? ` · ${y.escaladesDanger} danger` : ''}
          </Link>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}>à jour</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-[12px] gap-y-[11px]" style={{ marginTop: 13 }}>
        {metrics.map((m) => (
          <div key={m.label}>
            <div style={{ fontSize: 22, fontWeight: 900, color: m.good === false ? 'var(--gj-yellow-ink)' : 'var(--gj-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--gj-grey)', marginTop: 3 }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const OPP_COLOR: Record<string, string> = {
  Emploi: '--gj-sector-numerique', Stage: '--gj-sector-entrepreneuriat', Formation: '--gj-sector-education',
  Bourse: '--gj-sector-sante', Volontariat: '--gj-sector-environnement', 'Appel à projets': '--gj-sector-culture',
}
function OppByType({ rows }: { rows: AdminDashboardData['oppByType'] }) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 16 }}>
      <h2 style={h2}>Opportunités par type</h2>
      <Sub>{rows.reduce((s, r) => s + r.total, 0)} offres · <b style={{ color: 'var(--gj-yellow-ink)' }}>+N</b> = en attente.</Sub>
      <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((r) => (
          <div key={r.type} style={{ display: 'grid', gridTemplateColumns: '95px 1fr auto', gap: 9, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gj-ink)' }}>{r.label}</span>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--gj-bg)', overflow: 'hidden' }}>
              <div style={{ width: `${(r.total / max) * 100}%`, height: '100%', borderRadius: 999, background: `rgb(var(${OPP_COLOR[r.label] ?? '--gj-sector-autre'}))` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gj-ink)', textAlign: 'right', minWidth: 34 }}>
              {r.total}{r.aModerer > 0 && <Link href="/admin/opportunites" style={{ marginLeft: 5, fontSize: 10.5, color: 'var(--gj-yellow-ink)', textDecoration: 'none' }}>+{r.aModerer}</Link>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activité récente (colonne gauche) ────────────────────────────────────────
function Activity({ pulse }: { pulse: AdminDashboardData['pulse'] }) {
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 18 }}>
      <h2 style={h2}>Activité récente</h2>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
        {pulse.length === 0 ? <Sub>Aucune activité enregistrée.</Sub> : pulse.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--gj-line)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gj-teal-deep)', marginTop: 6, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--gj-ink)' }}>{p.resume}</div>
              <div style={{ fontSize: 10.5, color: 'var(--gj-grey)', marginTop: 1 }}>{p.ago}</div>
            </div>
          </div>
        ))}
      </div>
      <Link href="/admin/journal-audit" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 800, color: 'var(--gj-teal-deep)', textDecoration: 'none' }}>Journal d&apos;audit →</Link>
    </div>
  )
}

// ── Ce qui arrive (rail) ─────────────────────────────────────────────────────
function Upcoming({ upcoming }: { upcoming: AdminDashboardData['upcoming'] }) {
  return (
    <div className="gj-registre-card" style={{ ...card, padding: 16 }}>
      <h2 style={h2}>Ce qui arrive</h2>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
        {upcoming.length === 0 ? <Sub>Rien de programmé.</Sub> : upcoming.map((u, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--gj-line)' }}>
            {iconBadge(u.kind === 'curation' ? 'check-circle' : 'calendar', u.kind === 'curation' ? 'var(--gj-yellow-soft)' : 'var(--gj-teal-soft)', u.kind === 'curation' ? 'var(--gj-yellow-ink)' : 'var(--gj-teal-deep)')}
            <div style={{ minWidth: 0, flex: 1, fontSize: 12.5, color: 'var(--gj-ink)' }}>{u.label}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gj-grey)', flexShrink: 0 }}>{u.when}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Composant principal — layout COCKPIT 2 colonnes ──────────────────────────
export type { AdminDashboardData }

export function AdminDashboardClient({ data, filters }: { data: AdminDashboardData; filters: DashboardFilters }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1360, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>
            Tableau de bord {data.regionScoped ? `— ${regionLabel(filters.region)}` : 'national'}
          </h1>
          <Sub>Ce qui demande ton attention, et comment la mission avance · {periodeLabel(filters.periode).toLowerCase()}.</Sub>
        </div>
        <DashboardFilterBar filters={filters} />
      </div>

      {/* Priorités — pleine largeur en tête */}
      <Briefing items={data.briefing} />

      {/* Cockpit : décision (gauche, resserrée) · contexte (rail droit) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-[16px] items-start">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Funnel steps={data.funnel} conversion={data.funnelConversion} />
          <ReseauList centres={data.centres} />
          <Activity pulse={data.pulse} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Kpis kpis={data.kpis} />
          <YayeBlock y={data.yaye} />
          <OppByType rows={data.oppByType} />
          <Upcoming upcoming={data.upcoming} />
          <MapCard geo={data.centresGeo} />
        </div>
      </div>
    </div>
  )
}
