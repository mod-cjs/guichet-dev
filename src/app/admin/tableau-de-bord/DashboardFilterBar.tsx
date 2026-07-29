'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, type CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { REGIONS_SENEGAL } from '@/lib/regions'
import { PERIODES, type DashboardFilters } from '@/lib/dashboard-filters'

/**
 * Barre de filtres transverses du dashboard (GUIC-679 · phase 2).
 * Période (segmented) + région (select) → met à jour l'URL (?periode=…&region=…),
 * ce qui re-rend la page serveur avec les données scopées (drill-down national↔local).
 */
export function DashboardFilterBar({ filters }: { filters: DashboardFilters }) {
  const router = useRouter()
  const sp = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp?.toString() ?? '')
      if (value === null || value === '' || value === 'all' || value === '12mois') params.delete(key)
      else params.set(key, value)
      const qs = params.toString()
      router.push(qs ? `/admin/tableau-de-bord?${qs}` : '/admin/tableau-de-bord', { scroll: false })
    },
    [router, sp],
  )

  const seg: CSSProperties = {
    display: 'flex', gap: 3, padding: 3, borderRadius: 10,
    background: 'var(--gj-bg)', border: '1px solid var(--gj-line)',
  }
  const segBtn = (active: boolean): CSSProperties => ({
    padding: '6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, border: 0, cursor: 'pointer',
    background: active ? 'var(--gj-surface)' : 'transparent',
    color: active ? 'var(--gj-ink)' : 'var(--gj-grey)',
    boxShadow: active ? 'var(--gj-edge)' : 'none',
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      {/* Période */}
      <div role="tablist" aria-label="Période" style={seg}>
        {PERIODES.map((p) => {
          const active = filters.periode === p.value
          return (
            <button key={p.value} type="button" role="tab" aria-selected={active} onClick={() => setParam('periode', p.value)} style={segBtn(active)}>
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Région */}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--gj-ink)', boxShadow: 'var(--gj-edge)' }}>
        <Icon name="pin" size={14} style={{ color: 'var(--gj-grey)' }} />
        <span className="sr-only">Région</span>
        <select
          value={filters.region}
          onChange={(e) => setParam('region', e.target.value)}
          aria-label="Filtrer par région"
          style={{ border: 0, background: 'transparent', color: 'var(--gj-ink)', fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
        >
          <option value="all">Tout le Sénégal</option>
          {REGIONS_SENEGAL.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </label>

      {filters.region !== 'all' && (
        <button type="button" onClick={() => setParam('region', 'all')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--gj-teal-deep)', background: 'none', border: 0, cursor: 'pointer' }}>
          ↺ National
        </button>
      )}
    </div>
  )
}
