import { Icon, type IconName } from '@/components/ui/Icon'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RegionFunnel {
  region: string
  total: number
  onboardes: number
  taux: number
}

export interface MoisInscriptions {
  mois: string
  count: number
}

export interface FunnelData {
  total: number
  onboardes: number
  /** % onboardés / total */
  tauxComplete: number
  /** Jeunes avec un brouillon d'onboarding (commencé, non finalisé) */
  enCours: number
  /** Brouillons inactifs depuis > 7 jours (à relancer) */
  aRelancer: number
  /** Score de complétude moyen des profils */
  completudeMoyenne: number
  parRegion: RegionFunnel[]
  inscriptionsParMois: MoisInscriptions[]
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Stat({ icon, label, value, suffix, tone = 'teal' }: { icon: IconName; label: string; value: number; suffix?: string; tone?: 'teal' | 'green' | 'yellow' | 'red' }) {
  const bg = `var(--gj-${tone}-soft)`
  const fg = `var(--gj-${tone === 'teal' ? 'teal-deep' : tone + '-ink'})`
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 12, padding: 16 }}>
      <span style={{ display: 'inline-flex', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: bg, color: fg }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', marginTop: 10, lineHeight: 1 }}>{value.toLocaleString('fr-FR')}{suffix ?? ''}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gj-grey)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Bar({ pct, color = 'var(--gj-teal)' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 7, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color }} />
    </div>
  )
}

// ─── Composant principal (supervision — lecture seule) ──────────────────────

export function AdminOnboardingFunnel({ data }: { data: FunnelData }) {
  const nonDemarre = Math.max(0, data.total - data.onboardes - data.enCours)
  const maxMois = Math.max(1, ...data.inscriptionsParMois.map((m) => m.count))

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Onboarding</h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
            {data.total.toLocaleString('fr-FR')} bénéficiaires · suivi de l&apos;enrôlement YEAH
          </p>
        </div>

        {/* KPIs funnel */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }} className="md:!grid-cols-4">
          <Stat icon="users" label="Onboardés" value={data.onboardes} tone="green" />
          <Stat icon="bolt" label="En cours" value={data.enCours} tone="teal" />
          <Stat icon="clock" label="À relancer" value={data.aRelancer} tone="red" />
          <Stat icon="check-circle" label="Complétude moyenne" value={data.completudeMoyenne} suffix="%" tone="yellow" />
        </div>

        {/* Funnel global */}
        <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18, marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--gj-ink)' }}>Taux de complétion</h2>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--gj-green-ink)' }}>{data.tauxComplete}&nbsp;%</span>
          </div>
          <Bar pct={data.tauxComplete} color="linear-gradient(90deg, var(--gj-teal), var(--gj-teal-deep))" />
          <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--gj-grey)' }}>
            <span><b style={{ color: 'var(--gj-green-ink)' }}>{data.onboardes.toLocaleString('fr-FR')}</b> onboardés</span>
            <span><b style={{ color: 'var(--gj-teal-deep)' }}>{data.enCours.toLocaleString('fr-FR')}</b> en cours</span>
            <span><b style={{ color: 'var(--gj-grey)' }}>{nonDemarre.toLocaleString('fr-FR')}</b> non démarré</span>
          </div>
        </div>

        {/* Grille : par région + inscriptions par mois */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }} className="md:!grid-cols-2">
          {/* Par région */}
          <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--gj-ink)', marginBottom: 14 }}>Complétion par région</h2>
            {data.parRegion.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gj-grey)' }}>Aucune donnée régionale.</p>
            ) : (
              data.parRegion.map((r) => (
                <div key={r.region} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: 'var(--gj-ink)' }}>{r.region}</span>
                    <span style={{ color: 'var(--gj-grey)' }}>
                      <b style={{ color: 'var(--gj-ink)' }}>{r.taux}&nbsp;%</b> · {r.onboardes.toLocaleString('fr-FR')}/{r.total.toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <Bar pct={r.taux} />
                </div>
              ))
            )}
          </div>

          {/* Inscriptions par mois */}
          <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--gj-ink)', marginBottom: 14 }}>Nouvelles inscriptions</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
              {data.inscriptionsParMois.map((m) => (
                <div key={m.mois} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gj-ink)' }}>{m.count}</span>
                  <div style={{ width: '100%', height: `${Math.round((m.count / maxMois) * 90)}px`, minHeight: 3, borderRadius: 6, background: 'linear-gradient(180deg, var(--gj-teal), var(--gj-teal-deep))' }} />
                  <span style={{ fontSize: 11, color: 'var(--gj-grey)' }}>{m.mois}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
