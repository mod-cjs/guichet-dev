'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import type { PageInfo } from '@/lib/centre-pagination'

/**
 * Pager URL-bound (GUIC-687) : « X–Y sur N » + précédent/suivant. Met à jour le paramètre
 * `<prefix>Page` en préservant les autres (onglet, recherche…). Rendu même à 1 page (affiche
 * le compteur, boutons désactivés) pour une info de volume honnête.
 */
export function CentrePager({ prefix, info, label = 'éléments' }: { prefix: string; info: PageInfo; label?: string }) {
  const router = useRouter()
  const params = useSearchParams()

  function go(page: number) {
    const next = new URLSearchParams(params.toString())
    if (page <= 1) next.delete(`${prefix}Page`)
    else next.set(`${prefix}Page`, String(page))
    router.push(`?${next.toString()}`, { scroll: false })
  }

  const btn = (dir: -1 | 1, disabled: boolean) => (
    <button
      type="button"
      aria-label={dir === -1 ? 'Page précédente' : 'Page suivante'}
      disabled={disabled}
      onClick={() => go(info.page + dir)}
      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--gj-line)', background: 'transparent', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}
    >
      <Icon name={dir === -1 ? 'chevron-left' : 'chevron-right'} size={15} />
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>
        {info.total === 0 ? `Aucun ${label.replace(/s$/, '')}` : <>{info.from}–{info.to} sur <b style={{ color: 'var(--gj-ink)' }}>{info.total}</b> {label}</>}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {btn(-1, info.page <= 1)}
        <span style={{ fontSize: 12, color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', padding: '0 4px' }}>{info.page} / {info.totalPages}</span>
        {btn(1, info.page >= info.totalPages)}
      </div>
    </div>
  )
}
