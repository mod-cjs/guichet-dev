import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { ConseillerKpi } from '@/lib/loaders/conseiller'

/**
 * GUIC-494 — US-2 · 4 indicateurs clés du dashboard conseiller.
 * Rendu fidèle à `design-guichet-v4/agent-web.jsx` (AgentDashboard) :
 * carte icône + valeur 28px + label + delta ; carte « Réservations à valider »
 * en état action (bord doré, pill ACTION, cliquable).
 */

const TONES: Record<ConseillerKpi['tone'], { soft: string; ink: string }> = {
  teal: { soft: 'var(--gj-teal-soft)', ink: 'var(--gj-teal-deep)' },
  yellow: { soft: 'var(--gj-yellow-soft)', ink: 'var(--gj-yellow-ink)' },
  blue: { soft: 'var(--gj-blue-soft)', ink: 'var(--gj-blue-ink)' },
  green: { soft: 'var(--gj-green-soft)', ink: 'var(--gj-green-ink)' },
}

function KpiCard({ kpi }: { kpi: ConseillerKpi }) {
  const tone = TONES[kpi.tone]
  return (
    <div
      className="bg-white rounded-gj-lg p-space-4 flex flex-col"
      style={{ border: `1.5px solid ${kpi.urgent ? 'var(--gj-yellow)' : 'var(--gj-line)'}`, minHeight: 118 }}
    >
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center justify-center rounded-gj-md shrink-0" style={{ width: 38, height: 38, background: tone.soft, color: tone.ink }}>
          <Icon name={kpi.icon} size={19} />
        </span>
        {kpi.urgent && (
          <span className="font-extrabold" style={{ fontSize: 9.5, color: 'var(--gj-yellow-ink)', background: 'var(--gj-yellow-soft)', padding: '2px 8px', borderRadius: 999 }}>
            ACTION
          </span>
        )}
      </div>
      <div className="font-black text-color-text-primary mt-space-3" style={{ fontSize: 28, lineHeight: 1 }}>
        {kpi.value.toLocaleString('fr-FR')}
      </div>
      <div className="font-bold text-color-text-primary mt-space-2" style={{ fontSize: 12 }}>{kpi.label}</div>
      <div className="hidden sm:block text-color-text-secondary" style={{ fontSize: 11, marginTop: 2 }}>{kpi.delta}</div>
    </div>
  )
}

export function DashboardKpis({ kpis }: { kpis: ConseillerKpi[] }) {
  return (
    <section aria-label="Indicateurs clés" className="grid gap-space-3 grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) =>
        kpi.urgent && kpi.href ? (
          <Link key={kpi.key} href={kpi.href} className="no-underline" aria-label={`${kpi.label} : ${kpi.value}`}>
            <KpiCard kpi={kpi} />
          </Link>
        ) : (
          <KpiCard key={kpi.key} kpi={kpi} />
        ),
      )}
    </section>
  )
}
