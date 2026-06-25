'use client'

import { LineChart } from '@/components/admin/charts/LineChart'
import { BarChart, type BarChartItem } from '@/components/admin/charts/BarChart'
import { Donut, type DonutSegment } from '@/components/admin/charts/Donut'
import { Icon } from '@/components/ui/Icon'

// ─── types ────────────────────────────────────────────────────────────────────

export interface AdminStatsData {
  growthLabels: string[]
  growthValues: number[]
  candidatures: BarChartItem[]
  accountSplit: DonutSegment[]
  byRegion: BarChartItem[]
  totalComptes: number
}

export interface AdminStatsClientProps {
  data: AdminStatsData
}

// Exports admin session-gated, données réelles Prisma (C3). On n'expose QUE les
// jeux de données réellement alimentés : Formations (modèle inexistant) et
// Programmes (hors scope admin) sont retirés — pas de bouton qui exporte du vide.
// Les routes `/api/v1/export/*` (clé Data Hub) restent pour l'interop machine.
const EXPORTS: { label: string; href: string }[] = [
  { label: 'Utilisateurs', href: '/api/admin/export/utilisateurs' },
  { label: 'Opportunités', href: '/api/admin/export/opportunites' },
]

// ─── card shell ───────────────────────────────────────────────────────────────

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] p-[18px]"
      style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}
    >
      <h2 className="text-[15px] font-black mb-[14px]" style={{ color: 'var(--gj-ink)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * AdminStatsClient — Lot 11 admin · Statistiques & rapports.
 * Réutilise les primitives charts partagées (GUIC-451). Séries 100 % Prisma.
 */
export function AdminStatsClient({ data }: AdminStatsClientProps) {
  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* Header + export */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>
              Statistiques &amp; rapports
            </h1>
            <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
              Indicateurs clés du réseau · année en cours
            </p>
          </div>
          <div className="flex items-center gap-[8px] flex-wrap">
            <span
              className="inline-flex items-center gap-[6px] text-[12.5px] font-bold"
              style={{ color: 'var(--gj-grey)' }}
            >
              <Icon name="download" size={15} />
              Exporter le rapport :
            </span>
            {EXPORTS.map((e) => (
              <a
                key={e.href}
                href={e.href}
                className="inline-flex items-center gap-[6px] text-[12.5px] font-bold rounded-[9px] px-[12px] py-[7px]"
                style={{
                  background: 'var(--gj-surface)',
                  color: 'var(--gj-ink)',
                  border: '1.5px solid var(--gj-line)',
                }}
              >
                {e.label}
              </a>
            ))}
          </div>
        </div>

        {/* Grille 2×2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
          <StatCard title="Inscriptions cumulées">
            <LineChart data={data.growthValues} labels={data.growthLabels} color="var(--gj-blue-ink)" />
          </StatCard>

          <StatCard title="Candidatures par mois">
            {data.candidatures.length > 0 ? (
              <BarChart data={data.candidatures} />
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>
                —
              </p>
            )}
          </StatCard>

          <StatCard title="Comptes par rôle">
            <div className="flex items-center gap-[18px] flex-wrap">
              <Donut data={data.accountSplit} total={data.totalComptes} size={150} />
              <ul className="flex flex-col gap-[8px]">
                {data.accountSplit.map((s) => (
                  <li key={s.label} className="flex items-center gap-[8px] text-[12.5px]">
                    <span
                      className="inline-block rounded-full"
                      style={{ width: 10, height: 10, background: s.color }}
                      aria-hidden
                    />
                    <span className="font-bold" style={{ color: 'var(--gj-ink)' }}>
                      {s.label}
                    </span>
                    <span style={{ color: 'var(--gj-grey)' }}>
                      {s.value.toLocaleString('fr-FR')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </StatCard>

          <StatCard title="Inscriptions par région">
            {data.byRegion.length > 0 ? (
              <BarChart data={data.byRegion} color="var(--gj-teal-deep)" />
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>
                —
              </p>
            )}
          </StatCard>
        </div>
      </div>
    </div>
  )
}
