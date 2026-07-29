import type { CSSProperties } from 'react'
import type { CentresAnalytics } from '@/lib/loaders/centres-analytics'

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 16 }

/**
 * Onglet Fréquentation de la fiche Centre (GUIC-687) — re-log de l'analytics
 * check-ins (QR/manuel), scopé au centre. Aplats, theme-aware.
 */
export function CentreFrequentation({ analytics }: { analytics: CentresAnalytics }) {
  const a = analytics.accesQr
  const kpis = [
    { label: 'Total accès (90 j)', value: a.total.toLocaleString('fr-FR') },
    { label: 'Accès par QR', value: a.parQr.toLocaleString('fr-FR') },
    { label: 'Accès manuels', value: a.parManuel.toLocaleString('fr-FR') },
    { label: 'Part des accès QR', value: `${Math.round(a.tauxQr * 100)} %` },
  ]
  const days = analytics.accesQrParJour
  const max = Math.max(1, ...days.map((d) => d.count))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {kpis.map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--gj-ink)', margin: '0 0 4px' }}>Accès par QR — par jour</h2>
        <div style={{ fontSize: 12, color: 'var(--gj-grey)', marginBottom: 14 }}>Fréquentation badge à l&apos;entrée (90 derniers jours).</div>
        {days.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)' }}>Aucun accès enregistré sur la période.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
            {days.map((d) => (
              <div key={d.date} title={`${d.date} · ${d.count}`} style={{ flex: 1, minWidth: 2, height: `${Math.max(4, (d.count / max) * 100)}%`, background: 'var(--gj-teal-deep)', borderRadius: '3px 3px 0 0' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
