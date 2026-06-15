'use client'
import { useCallback, useId, useRef, type KeyboardEvent } from 'react'

export interface TabItem<V extends string = string> {
  /** Valeur logique de l'onglet (slug, enum, etc.). */
  value: V
  /** Label affiché. */
  label: string
  /** Compteur optionnel rendu en pill discret après le label. */
  count?: number
  /** ID du panel contrôlé (aria-controls). */
  controls?: string
}

export interface TabsProps<V extends string = string> {
  /** Valeur active. */
  value: V
  /** Callback appelé quand l'utilisateur sélectionne un onglet. */
  onChange: (value: V) => void
  /** Liste des onglets. */
  items: ReadonlyArray<TabItem<V>>
  /** Libellé du tablist (aria-label). */
  ariaLabel: string
  /** Classes additionnelles sur le conteneur. */
  className?: string
}

/**
 * <Tabs /> — tablist conforme APG WAI Tab Pattern.
 *
 * - role="tablist" + role="tab" + aria-selected, aria-controls (optionnel)
 * - Navigation clavier : ArrowLeft / ArrowRight (boucle), Home, End
 * - Sélection visuelle : border-bottom 2px var(--gj-teal-deep) + bold sur l'actif
 * - Mobile : scroll horizontal autorisé (tablist de filtres, pas une nav)
 *   avec snap-x et scrollbar masquée. Desktop : flex-wrap.
 * - Tap-min 44px.
 *
 * Note CLAUDE.md : la règle "jamais overflow-x sur container de nav" cible
 * les containers de navigation. Un tablist de filtres est un widget de
 * sélection, pas une navigation — le scroll horizontal mobile est admis.
 */
export function Tabs<V extends string = string>({
  value,
  onChange,
  items,
  ariaLabel,
  className = '',
}: TabsProps<V>) {
  const idBase = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const currentIndex = Math.max(
    0,
    items.findIndex((it) => it.value === value),
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (items.length === 0) return
      let nextIndex = -1
      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % items.length
          break
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + items.length) % items.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = items.length - 1
          break
        default:
          return
      }
      e.preventDefault()
      const target = items[nextIndex]
      if (!target) return
      onChange(target.value)
      // Move DOM focus to the new tab (APG : focus suit la sélection).
      const node = refs.current[nextIndex]
      if (node) node.focus()
    },
    [currentIndex, items, onChange],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        // Mobile : scroll horizontal (filter tablist, not a nav).
        // Desktop (≥sm) : wrap normal.
        'flex flex-nowrap sm:flex-wrap gap-space-1',
        'overflow-x-auto sm:overflow-visible',
        'snap-x snap-mandatory sm:snap-none',
        'scrollbar-hide',
        '-mx-space-2 px-space-2 sm:mx-0 sm:px-0',
        className,
      ].join(' ')}
    >
      {items.map((item, i) => {
        const active = item.value === value
        const tabId = `${idBase}-tab-${item.value}`
        return (
          <button
            key={item.value}
            id={tabId}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={item.controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={handleKeyDown}
            className={[
              'inline-flex items-center gap-2 px-space-3',
              'min-h-[var(--tap-min)]',
              'snap-start shrink-0',
              'text-fs-300 leading-none whitespace-nowrap',
              'border-b-2 transition-colors duration-200',
              'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
              active
                ? 'border-gj-teal-deep text-gj-ink font-bold'
                : 'border-transparent text-gj-grey hover:text-color-text-primary font-medium',
            ].join(' ')}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span
                aria-hidden="true"
                className={[
                  'inline-flex items-center justify-center',
                  'min-w-[20px] h-[20px] px-1.5',
                  'rounded-gj-pill text-fs-100 font-bold leading-none',
                  active
                    ? 'bg-gj-teal-soft text-gj-teal-deep'
                    : 'bg-gj-bg text-gj-grey',
                ].join(' ')}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
