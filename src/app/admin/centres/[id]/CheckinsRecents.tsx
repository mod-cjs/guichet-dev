import type { PageInfo } from '@/lib/centre-pagination'
import { CentreSearch } from './CentreSearch'
import { CentrePager } from './CentrePager'

export interface CheckinRow { id: string; jeune: string; via: string; dwell: string | null; quand: string }

function initials(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
}

/** Check-ins récents (onglet Fréquentation, fidèle cFreq) — recherche + pagination SERVEUR.
 * Le scan est une opération de terrain (staff, via QR badge) — pas d'action ici. */
export function CheckinsRecents({ checkins, info }: { checkins: CheckinRow[]; info: PageInfo }) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h6 style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flexShrink: 0 }} />
          Check-ins récents
        </h6>
        <CentreSearch prefix="ci" placeholder="Rechercher un jeune…" label="Rechercher un check-in" />
      </div>

      {checkins.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun check-in{info.total === 0 ? ' récent' : ' pour cette recherche'}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {checkins.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', color: 'var(--gj-yellow-ink)' }}>{initials(c.jeune)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 13, color: 'var(--gj-ink)', display: 'block' }}>{c.jeune}</b>
                <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', display: 'block' }}>{c.via}{c.dwell ? ` · ${c.dwell}` : ''}</span>
              </div>
              <time style={{ fontSize: 11, color: 'var(--gj-grey)', whiteSpace: 'nowrap' }}>{c.quand}</time>
            </div>
          ))}
        </div>
      )}

      <CentrePager prefix="ci" info={info} label="check-ins" />
      <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 10, marginBottom: 0 }}>Le check-in se fait au centre par le staff, via scan du QR badge (MyCJSCard).</p>
    </div>
  )
}
