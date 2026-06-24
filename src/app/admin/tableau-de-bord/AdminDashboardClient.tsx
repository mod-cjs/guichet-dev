'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Spark } from '@/components/admin/charts/Spark'
import { LineChart } from '@/components/admin/charts/LineChart'
import { BarChart, type BarChartItem } from '@/components/admin/charts/BarChart'
import { Donut, type DonutSegment } from '@/components/admin/charts/Donut'
import { CentresMapGoogle } from '@/components/centres/CentresMapGoogle'

// ── Types exportés (utilisés aussi par la page serveur) ──────────────────────

export interface DashboardCentre {
  id: string
  nom: string
  latitude: number
  longitude: number
  region: string
  slug: string
}

export interface GrowthPoint {
  month: string
  cumulative: number
}

export interface DashboardKPIs {
  jeunesInscrits: number
  centresActifs: number
  aModerer: number
  /** Candidatures retenues ce mois (statut=Retenue) — null si aucune, affiche "—". */
  insertionsMois: number | null
  /** Nouveaux inscrits ce mois (delta jeunes). */
  jeunesNouveauxMois: number
  /** Variation des insertions vs mois précédent (%), null si non calculable. */
  insertionsDeltaPct: number | null
}

/** Indicateur secondaire (bandeau de mini-KPIs) — données réelles uniquement. */
export interface SecondaryKpi {
  label: string
  value: string
  icon: IconName
}

export interface DashboardData {
  kpis: DashboardKPIs
  growthSeries: GrowthPoint[]
  accountSplit: DonutSegment[]
  monthlyCandidatures: BarChartItem[]
  /** Centres géolocalisés pour la carte « Présence nationale ». */
  centres: DashboardCentre[]
  /** Indicateurs secondaires (taux d'insertion, candidatures, ateliers, partenaires…). */
  secondaires: SecondaryKpi[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

interface KpiDef {
  label: string
  value: string
  tone: 'teal' | 'blue' | 'green' | 'yellow'
  icon: 'users' | 'pin' | 'shield' | 'trending'
  spark: number[]
  urgent?: boolean
  /** Si défini, la carte KPI devient un lien vers cette destination. */
  href?: string
  /** Ligne de variation sous la valeur (ex « +1 240 ce mois »). */
  delta?: string
  /** Sens de la variation (vert si true, neutre/jaune sinon). */
  deltaUp?: boolean
}

function buildKpis(kpis: DashboardKPIs, growthSeries: GrowthPoint[]): KpiDef[] {
  // Sparkline inscriptions : données cumulées des 7 derniers mois
  const sparkGrowth = growthSeries.map((g) => g.cumulative)

  return [
    {
      label: 'Jeunes inscrits',
      value: fmt(kpis.jeunesInscrits),
      tone: 'teal',
      icon: 'users',
      spark: sparkGrowth.length > 0 ? sparkGrowth : [kpis.jeunesInscrits],
      delta: `+${fmt(kpis.jeunesNouveauxMois)} ce mois`,
      deltaUp: true,
    },
    {
      label: 'Centres actifs',
      value: fmt(kpis.centresActifs),
      tone: 'blue',
      icon: 'pin',
      spark: [kpis.centresActifs],
    },
    {
      label: 'À modérer',
      value: fmt(kpis.aModerer),
      tone: 'yellow',
      icon: 'shield',
      spark: [kpis.aModerer],
      urgent: kpis.aModerer > 0,
      href: '/admin/opportunites',
    },
    {
      // Candidatures avec statut=Retenue ce mois (libellé honnête — distinct du modèle Insertion).
      label: 'Candidatures retenues',
      value: kpis.insertionsMois != null ? fmt(kpis.insertionsMois) : '—',
      tone: 'green',
      icon: 'trending',
      spark:
        kpis.insertionsMois != null
          ? [Math.max(0, kpis.insertionsMois - 10), kpis.insertionsMois]
          : [0],
      delta:
        kpis.insertionsDeltaPct != null
          ? `${kpis.insertionsDeltaPct >= 0 ? '+' : ''}${kpis.insertionsDeltaPct}% vs mois dernier`
          : undefined,
      deltaUp: (kpis.insertionsDeltaPct ?? 0) >= 0,
    },
  ]
}

// Tone → tokens CSS
const TONE_BG: Record<string, string> = {
  teal: 'var(--gj-teal-soft)',
  blue: 'var(--gj-blue-soft)',
  green: 'var(--gj-green-soft)',
  yellow: 'var(--gj-yellow-soft)',
}
const TONE_FG: Record<string, string> = {
  teal: 'var(--gj-teal-deep)',
  blue: 'var(--gj-blue-ink)',
  green: 'var(--gj-green-ink)',
  yellow: 'var(--gj-yellow-ink)',
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  data: DashboardData
}

export function AdminDashboardClient({ data }: Props) {
  const { kpis, growthSeries, accountSplit, monthlyCandidatures, centres, secondaires } = data
  const kpiDefs = buildKpis(kpis, growthSeries)

  const growthLabels = growthSeries.map((g) => g.month)
  const growthValues = growthSeries.map((g) => g.cumulative)

  const totalComptes = accountSplit.reduce((s, d) => s + d.value, 0)

  return (
    <div
      style={{
        padding: '22px 28px 40px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: 'var(--gj-ink)',
            margin: 0,
          }}
        >
          Tableau de bord national
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--gj-grey)',
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Vue d&apos;ensemble du réseau Guichet Jeunesse &middot;{' '}
          {kpis.centresActifs} centres &middot; mis à jour à l&apos;instant.
        </p>
      </div>

      {/* ── 4 cartes KPI ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gap: 14,
        }}
        // Mobile 2×2, desktop 4 — colonnes pilotées par Tailwind (responsive)
        className="grid grid-cols-2 sm:grid-cols-4"
      >
        {kpiDefs.map((k, i) => {
          const baseStyle = {
            background: 'var(--gj-surface)',
            border: `1.5px solid ${k.urgent ? 'var(--gj-yellow)' : 'var(--gj-line)'}`,
            borderRadius: 14,
            padding: 16,
            display: 'block',
          }
          const inner = (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: TONE_BG[k.tone],
                    color: TONE_FG[k.tone],
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={k.icon} size={18} />
                </span>
                {k.spark.length > 0 && (
                  <Spark data={k.spark} color={TONE_FG[k.tone]} />
                )}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: 'var(--gj-ink)',
                  marginTop: 10,
                  lineHeight: 1,
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--gj-ink)',
                  marginTop: 5,
                }}
              >
                {k.label}
              </div>
              {k.delta && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    marginTop: 3,
                    color: k.deltaUp ? 'var(--gj-green-ink)' : 'var(--gj-yellow-ink)',
                  }}
                >
                  {k.delta}
                </div>
              )}
            </>
          )
          return k.href ? (
            <Link
              key={i}
              href={k.href}
              aria-label={k.label}
              style={{ ...baseStyle, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            >
              {inner}
            </Link>
          ) : (
            <div key={i} style={{ ...baseStyle, cursor: k.urgent ? 'pointer' : 'default' }}>
              {inner}
            </div>
          )
        })}
      </div>

      {/* ── Indicateurs secondaires (mini-KPIs, données réelles) ──────────── */}
      {secondaires.length > 0 && (
        <div
          style={{ display: 'grid', gap: 10, marginBottom: 20 }}
          className="grid-cols-2 sm:grid-cols-4"
        >
          {secondaires.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--gj-surface)',
                border: '1.5px solid var(--gj-line)',
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: 'var(--gj-teal-soft)',
                  color: 'var(--gj-teal-deep)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={s.icon} size={15} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gj-ink)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grille LineChart + Donut ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gap: 20,
          alignItems: 'start',
        }}
        // Mobile 1 colonne, desktop 1.3fr/1fr — responsive (évite l'overflow horizontal mobile)
        className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr]"
      >
        {/* LineChart : Croissance des inscriptions */}
        <div
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
              Croissance des inscriptions
            </h2>
            {growthValues.length >= 2 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--gj-green-ink)',
                }}
              >
                {growthValues[0] > 0
                  ? `+${Math.round(((growthValues[growthValues.length - 1] - growthValues[0]) / growthValues[0]) * 100)}% sur ${growthValues.length} mois`
                  : ''}
              </span>
            )}
          </div>
          {growthValues.length > 0 ? (
            <LineChart data={growthValues} labels={growthLabels} />
          ) : (
            <p style={{ color: 'var(--gj-grey)', fontSize: 13 }}>—</p>
          )}
        </div>

        {/* Donut : Répartition des comptes */}
        <div
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14, marginTop: 0 }}>
            Répartition des comptes
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <Donut data={accountSplit} total={totalComptes} />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
                minWidth: 120,
              }}
            >
              {accountSplit.map((d, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 3,
                      background: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: 'var(--gj-grey)',
                      fontWeight: 600,
                    }}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: 'var(--gj-ink)',
                    }}
                  >
                    {fmt(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Présence nationale (carte Google Maps des centres) ───────────── */}
      <div
        style={{
          background: 'var(--gj-surface)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 14,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: 'var(--gj-ink)' }}>Présence nationale</h2>
          <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>
            {centres.length} centre{centres.length > 1 ? 's' : ''} géolocalisé{centres.length > 1 ? 's' : ''}
          </span>
        </div>
        <CentresMapGoogle
          centres={centres.map((c) => ({ id: c.id, nom: c.nom, latitude: c.latitude, longitude: c.longitude }))}
          centresForList={centres.map((c) => ({ id: c.id, nom: c.nom, region: c.region, slug: c.slug }))}
          height={320}
          zoom={6}
          disableUI
        />
      </div>

      {/* ── BarChart + call-out modération ───────────────────────────────── */}
      <div
        style={{
          background: 'var(--gj-surface)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
            Candidatures retenues / mois
          </h2>
          <Link
            href="/admin/data-hub"
            style={{
              background: 'transparent',
              color: 'var(--gj-teal-deep)',
              fontWeight: 800,
              fontSize: 12.5,
              textDecoration: 'none',
            }}
          >
            Détails →
          </Link>
        </div>

        {monthlyCandidatures.length > 0 ? (
          <BarChart data={monthlyCandidatures} />
        ) : (
          <p style={{ color: 'var(--gj-grey)', fontSize: 13 }}>—</p>
        )}

        {/* Call-out modération */}
        {kpis.aModerer > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'center',
              marginTop: 14,
              padding: '11px 13px',
              background: 'var(--gj-yellow-soft)',
              borderRadius: 10,
            }}
          >
            <Icon
              name="shield"
              size={17}
              style={{ color: 'var(--gj-yellow-ink)', flexShrink: 0 }}
            />
            <div
              style={{
                flex: 1,
                fontSize: 12.5,
                color: 'var(--gj-yellow-ink)',
                fontWeight: 600,
              }}
            >
              <b>{fmt(kpis.aModerer)} publication{kpis.aModerer > 1 ? 's' : ''}</b>{' '}
              en attente de modération.
            </div>
            <Link
              href="/admin/opportunites"
              style={{
                background: 'var(--gj-yellow)',
                color: 'var(--gj-admin-on-gold)',
                border: 0,
                padding: '7px 13px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 12,
                textDecoration: 'none',
                display: 'inline-block',
                minHeight: 44,
                lineHeight: '30px',
              }}
            >
              Modérer
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
