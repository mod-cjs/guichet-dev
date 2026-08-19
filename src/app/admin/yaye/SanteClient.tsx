'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { YayeSante } from '@/lib/ia/admin/sante'

// GUIC-435 (Phase 4 — « Santé de Yaye ») — hub qui agrège en une photo les signaux qui
// vivaient sur des écrans séparés (qualité/YQS, escalades & SLA, couverture d'éval, dérive
// de calibration, intentions en échec). Honnêteté v5 : toute valeur null → « — », jamais un
// nombre inventé ; les couleurs de statut suivent les signaux réels, jamais décoratives.

export interface SanteClientProps {
  sante: YayeSante
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Affiche une valeur numérique, ou « — » si absente — jamais 0 par défaut. */
function fmt(n: number | null, suffix = ''): string {
  return n == null ? '—' : `${n}${suffix}`
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function SanteClient({ sante }: SanteClientProps) {
  const { alertes, yqs, escalades, coverage, calibrationDrift, topEchecs } = sante

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Santé de Yaye</h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
            Vue unifiée des signaux qualité, escalades, couverture d&apos;évaluation et calibration.
          </p>
        </div>

        {/* ── Alertes opérationnelles ── */}
        <div data-testid="sante-alertes" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {alertes.length === 0 ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                borderRadius: 12, background: 'var(--gj-green-soft)', border: '1.5px solid var(--gj-green-soft)',
              }}
            >
              <Icon name="check-circle" size={18} style={{ color: 'var(--gj-green-ink)', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gj-green-ink)' }}>
                Aucune alerte — Yaye se porte bien.
              </span>
            </div>
          ) : (
            alertes.map((a, i) => {
              const critique = a.niveau === 'critique'
              return (
                <div
                  key={i}
                  data-testid={`alerte-${a.niveau}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                    borderRadius: 12,
                    background: critique ? 'var(--gj-red-soft)' : 'var(--gj-yellow-soft)',
                    border: `1.5px solid ${critique ? 'var(--gj-red-soft)' : 'var(--gj-yellow-soft)'}`,
                  }}
                >
                  <Icon
                    name="alert"
                    size={18}
                    style={{ color: critique ? 'var(--gj-red-ink)' : 'var(--gj-yellow-ink)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: critique ? 'var(--gj-red-ink)' : 'var(--gj-yellow-ink)' }}>
                    {a.message}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* ── Signaux clés ── */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24,
          }}
        >
          <Tuile icon="chart" label="YQS (qualité)" value={fmt(yqs, '/100')} />

          <Tuile icon="clock" label="Escalades">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--gj-ink)' }}>{escalades.enAttente} en attente</span>
              <span
                style={{
                  fontSize: 12.5, fontWeight: 800,
                  color: escalades.slaDepassees > 0 ? 'var(--gj-red-ink)' : 'var(--gj-grey)',
                }}
              >
                {escalades.slaDepassees} au-delà du SLA{escalades.dangerOuvertes > 0 ? ` · ${escalades.dangerOuvertes} danger` : ''}
              </span>
            </div>
          </Tuile>

          <Tuile icon="target" label="Couverture d'éval" value={`${coverage.evaluees}/${coverage.total} (${coverage.pct}%)`}>
            <span style={{ fontSize: 11, color: 'var(--gj-grey)', display: 'block', marginTop: 2 }}>
              échantillon — un score absent ≠ mauvais
            </span>
          </Tuile>

          <Tuile icon="shield" label="Dérive de calibration" value={fmt(calibrationDrift)} />
        </div>

        {/* ── Top intentions en échec ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--gj-ink)' }}>Top intentions en échec</h2>
            <Link href="/admin/analytics/yaye" style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gj-teal-deep)', textDecoration: 'none' }}>
              Voir tout →
            </Link>
          </div>
          <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
            {topEchecs.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 13.5 }}>
                Pas assez de volume pour identifier des intentions en échec.
              </div>
            ) : (
              topEchecs.map((t, i) => (
                <div
                  key={t.intention}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 12, padding: '12px 18px',
                    borderBottom: i < topEchecs.length - 1 ? '1px solid var(--gj-line)' : 'none', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)' }}>{t.intention}</span>
                  <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Résolu {t.tauxResolu}%</span>
                  <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Escalade {t.tauxEscalade}%</span>
                  <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Drapeau {t.tauxDrapeauRouge}%</span>
                  <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>YQS {fmt(t.yqsMoyen)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Raccourcis ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Raccourci href="/admin/yaye/escalades" icon="alert" label="Escalades" />
          <Raccourci href="/admin/analytics/yaye" icon="chart" label="Analytics détaillé" />
          <Raccourci href="/admin/yaye/sessions" icon="chat" label="Sessions" />
        </div>
      </div>
    </div>
  )
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Tuile({
  icon, label, value, children,
}: {
  icon: 'chart' | 'clock' | 'target' | 'shield'
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon name={icon} size={14} style={{ color: 'var(--gj-grey)' }} />
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.3px' }}>
          {label}
        </span>
      </div>
      {value !== undefined && <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)' }}>{value}</div>}
      {children}
    </div>
  )
}

function Raccourci({ href, icon, label }: { href: string; icon: 'alert' | 'chart' | 'chat'; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800,
        color: 'var(--gj-teal-deep)', textDecoration: 'none', padding: '9px 14px', minHeight: 44,
        border: '1.5px solid var(--gj-line)', borderRadius: 10, background: 'var(--gj-surface)',
      }}
    >
      <Icon name={icon} size={15} />
      {label}
    </Link>
  )
}
