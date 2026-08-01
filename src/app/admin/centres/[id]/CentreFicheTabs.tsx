import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { CENTRE_TABS, type CentreTab } from '@/lib/centre-fiche-tabs'

/**
 * Barre d'onglets de la fiche Centre (GUIC-687) — liens URL-driven (?tab=…),
 * état actif rendu côté serveur. Aplats, theme-aware.
 */
export function CentreFicheTabs({ centreId, active }: { centreId: string; active: CentreTab }) {
  const base = `/admin/centres/${centreId}`
  return (
    <div role="tablist" aria-label="Sections du centre" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid var(--gj-line)' }}>
      {CENTRE_TABS.map((t) => {
        const on = t.value === active
        const style: CSSProperties = {
          display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          padding: '11px 14px', fontSize: 13, fontWeight: on ? 800 : 600,
          color: on ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
          borderBottom: `2px solid ${on ? 'var(--gj-teal-deep)' : 'transparent'}`,
          textDecoration: 'none', marginBottom: -1,
        }
        return (
          <Link key={t.value} href={t.value === 'vue' ? base : `${base}?tab=${t.value}`} role="tab" aria-selected={on} style={style}>
            <Icon name={t.icon} size={15} /> {t.label}
          </Link>
        )
      })}
    </div>
  )
}
