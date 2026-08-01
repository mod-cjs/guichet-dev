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
 * - Sélection visuelle (design v5, Lot 14 « Segmented ») : conteneur pilule
 *   (fond blanc, bordure, radius 12, padding 5) — l'actif est un fond
 *   var(--gj-teal-deep) plein + texte blanc, radius 8. Contrôle d'onglet
 *   unique de la plateforme.
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
        // Conteneur pilule (design v5, Lot 14 « Segmented ») : fond blanc,
        // bordure, radius 12, padding 5 — le contrôle d'onglet unique de la
        // plateforme.
        'inline-flex bg-gj-surface border-[1.5px] border-gj-line rounded-[12px] p-[5px]',
        // Mobile : scroll horizontal (filter tablist, not a nav).
        // Desktop (≥sm) : wrap normal.
        'flex-nowrap sm:flex-wrap gap-1.5',
        'overflow-x-auto sm:overflow-visible',
        'snap-x snap-mandatory sm:snap-none',
        'scrollbar-hide',
        'max-w-full',
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
              'inline-flex items-center justify-center gap-2 px-space-3',
              'min-h-[var(--tap-min)] rounded-gj-md',
              'snap-start shrink-0',
              'text-fs-300 leading-none whitespace-nowrap',
              'transition-colors duration-200',
              'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
              active
                ? 'bg-gj-teal-deep text-white font-bold'
                : 'bg-transparent text-gj-grey hover:text-color-text-primary font-medium',
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
                    ? 'bg-white/20 text-white'
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
