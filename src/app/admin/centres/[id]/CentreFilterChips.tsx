'use client'

import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Chips de filtre URL-bound (GUIC-687) : met à jour `<prefix>` en préservant les autres
 * paramètres et réinitialise `<prefix.replace(/[^a-z]/,'')>Page` à 1. Le filtrage se fait
 * côté serveur → porte sur tout le jeu de données.
 */
export function CentreFilterChips({
  param, pageParam, value, options,
}: {
  param: string
  pageParam: string
  value: string
  options: { value: string; label: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()

  function set(v: string) {
    const next = new URLSearchParams(params.toString())
    if (v === options[0]?.value) next.delete(param)
    else next.set(param, v)
    next.delete(pageParam) // nouveau filtre → page 1
    router.push(`?${next.toString()}`, { scroll: false })
  }

  return (
    <div role="tablist" aria-label="Filtres" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => set(o.value)}
            style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: on ? '1px solid transparent' : '1px solid var(--gj-line)', background: on ? 'var(--gj-admin-gold)' : 'transparent', color: on ? 'var(--gj-admin-on-gold)' : 'var(--gj-grey)' }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
