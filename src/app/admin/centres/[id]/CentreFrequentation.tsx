import type { CSSProperties } from 'react'
import type { CentresAnalytics } from '@/lib/loaders/centres-analytics'
import { CheckinsRecents, type CheckinRow } from './CheckinsRecents'
import type { PageInfo } from '@/lib/centre-pagination'

export type { CheckinRow }

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 12, boxShadow: 'var(--gj-edge)', padding: '13px 15px' }

const JOUR_LABEL = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const JOUR_ORDER = [1, 2, 3, 4, 5, 6, 0] // Lun → Dim

/** En-tête de section fidèle maquette : tiret doré + filet (`.dps h6`). */
function SectionH6({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>
      <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }} />
      {children}
    </div>
  )
}

/**
 * Onglet Fréquentation de la fiche Centre (GUIC-687) — fidélité maquette cFreq :
 * 4 tuiles ktile + barres par jour de semaine (check-ins) + légende.
 */
export function CentreFrequentation({ analytics, checkins = [], checkinsInfo }: { analytics: CentresAnalytics; checkins?: CheckinRow[]; checkinsInfo: PageInfo }) {
  const a = analytics.accesQr
  const kpis = [
    { label: 'Accès (90 j)', value: a.total.toLocaleString('fr-FR') },
    { label: 'Accès par QR', value: a.parQr.toLocaleString('fr-FR') },
    { label: 'Accès manuels', value: a.parManuel.toLocaleString('fr-FR') },
    { label: 'Part QR', value: `${Math.round(a.tauxQr * 100)} %` },
  ]

  // Agrégation des accès par jour de semaine (Lun → Dim).
  const buckets = new Array(7).fill(0)
  for (const d of analytics.accesQrParJour) buckets[new Date(d.date).getDay()] += d.count
  const bars = JOUR_ORDER.map((gd) => ({ label: JOUR_LABEL[gd], count: buckets[gd] as number }))
  const max = Math.max(1, ...bars.map((b) => b.count))
  const totalBars = bars.reduce((s, b) => s + b.count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} style={card}>
            <b style={{ fontSize: 21, fontWeight: 900, color: 'var(--gj-ink)', display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</b>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gj-grey)', display: 'block', marginTop: 6 }}>{k.label}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
        <SectionH6>Fréquentation par jour</SectionH6>
        {totalBars === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun accès enregistré sur la période.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, paddingTop: 10 }}>
              {bars.map((b) => (
                <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
                  <span aria-hidden title={`${b.label} · ${b.count}`} style={{ width: '100%', maxWidth: 34, height: `${Math.max(3, Math.round((b.count / max) * 100))}%`, borderRadius: '5px 5px 0 0', background: 'var(--gj-admin-gold)', display: 'block' }} />
                  <span style={{ fontSize: 10.5, color: 'var(--gj-grey)', fontWeight: 700 }}>{b.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gj-admin-gold)' }} />
                Accès physiques (check-in)
              </span>
            </div>
          </>
        )}
      </div>

      <CheckinsRecents checkins={checkins} info={checkinsInfo} />
    </div>
  )
}
