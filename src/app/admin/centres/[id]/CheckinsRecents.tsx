'use client'

import { useMemo, useState } from 'react'

export interface CheckinRow { id: string; jeune: string; via: string; dwell: string | null; quand: string }

function initials(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
}

const SEARCH = 'rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[8px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)] w-full max-w-[220px]'

/** Check-ins récents (onglet Fréquentation, fidèle cFreq) — lecture + recherche.
 * Le scan est une opération de terrain (staff, via QR badge) — pas d'action ici. */
export function CheckinsRecents({ checkins }: { checkins: CheckinRow[] }) {
  const [q, setQ] = useState('')
  const view = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s === '' ? checkins : checkins.filter((c) => `${c.jeune} ${c.via}`.toLowerCase().includes(s))
  }, [q, checkins])

  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h6 style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flexShrink: 0 }} />
          Check-ins récents
        </h6>
        <input className={SEARCH} placeholder="Rechercher…" aria-label="Rechercher un check-in" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {view.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun check-in{checkins.length ? ' pour cette recherche' : ' récent'}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {view.map((c) => (
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
      <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 10, marginBottom: 0 }}>Le check-in se fait au centre par le staff, via scan du QR badge (MyCJSCard).</p>
    </div>
  )
}
