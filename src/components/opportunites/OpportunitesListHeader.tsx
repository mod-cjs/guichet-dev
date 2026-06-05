'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui'
import type { OpportuniteSortBy } from '@/types/opportunite'

/**
 * <OpportunitesListHeader /> — en-tête liste opportunités (desktop only).
 *
 * GUIC-249 — Wave 3 audit UI. Conforme design v2
 * (`design-guichet-v2/lot3-opps-web.jsx#WebOppListHeader` L.195-248).
 *
 * Trois zones :
 *  1. Search bar large (max 520px) + sélecteur tri inline + raccourci ⌘K
 *  2. Titre dynamique (compte + query)
 *  3. Sous-ligne meta (filtres actifs / dernière mise à jour)
 *  4. Chips actives removables (un par filtre actif)
 *
 * Rendu masqué en mobile (`hidden lg:flex`) — l'expérience mobile reste
 * le composant `OpportunitesClient` actuel (search bar + sheet filtres).
 */

const SORT_OPTIONS: Array<{ value: OpportuniteSortBy; label: string }> = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'deadline', label: 'Échéance proche' },
]

export interface ActiveChip {
  /** Clé technique (utilisée pour distinguer le filtre à retirer). */
  key: string
  /** Libellé affiché dans le chip. */
  label: string
  /** Callback de retrait. */
  onRemove: () => void
}

export interface OpportunitesListHeaderProps {
  /** Valeur courante du champ recherche (contrôlé). */
  searchValue: string
  onSearchChange: (next: string) => void
  /** Tri actif. */
  sortBy: OpportuniteSortBy
  onSortChange: (next: OpportuniteSortBy) => void
  /** Nombre total de résultats. */
  total: number
  /** Si fourni, affiché dans le titre : `… · « <query> »`. */
  activeQuery?: string
  /** Chips représentant les filtres actifs (chacun avec son onRemove). */
  activeChips?: ActiveChip[]
  /** Affichage "Mis à jour il y a X" — fourni par le parent (côté client). */
  updatedAgo?: string
  /** Si true, masque le bloc (état loading par exemple). */
  className?: string
}

export function OpportunitesListHeader({
  searchValue,
  onSearchChange,
  sortBy,
  onSortChange,
  total,
  activeQuery,
  activeChips = [],
  updatedAgo,
  className = '',
}: OpportunitesListHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Raccourci clavier ⌘K / Ctrl+K — focus la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fermeture du menu tri au clic externe.
  useEffect(() => {
    if (!sortOpen) return
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [sortOpen])

  const activeCount = activeChips.length
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Pertinence'

  return (
    <header className={`hidden lg:flex flex-col gap-space-3 ${className}`}>
      {/* Search + sort row */}
      <div className="flex items-center gap-space-3 flex-wrap">
        <div
          className="flex items-center gap-space-2 bg-gj-surface border-[1.5px] border-gj-line
            rounded-gj-md px-space-3 min-h-[46px] flex-1 max-w-[520px]
            focus-within:border-gj-teal-deep focus-within:ring-[3px]
            focus-within:ring-[var(--focus-ring-soft)] transition-colors"
        >
          <Icon name="search" size={17} className="text-color-text-secondary" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cherche emploi, stage, bourse…"
            aria-label="Rechercher une opportunité"
            className="flex-1 bg-transparent border-0 outline-none text-fs-300 font-[inherit]
              text-color-text-primary placeholder:text-color-text-muted"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('')
                inputRef.current?.focus()
              }}
              aria-label="Effacer la recherche"
              className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-full
                text-color-text-secondary hover:bg-gj-bg
                focus:outline-none focus-visible:ring-[3px]
                focus-visible:ring-[var(--focus-ring-soft)]"
            >
              <Icon name="close" size={14} />
            </button>
          ) : (
            <kbd
              aria-hidden
              className="font-mono text-fs-100 bg-gj-bg border border-gj-line rounded
                px-[6px] py-[2px] text-color-text-secondary"
            >
              ⌘ K
            </kbd>
          )}
        </div>

        {/* Sélecteur tri inline */}
        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            className="inline-flex items-center gap-space-1 bg-gj-surface border-[1.5px]
              border-gj-line rounded-gj-md px-space-3 min-h-[46px] text-fs-300 font-bold
              text-color-text-primary hover:border-gj-line-strong transition-colors
              focus:outline-none focus-visible:ring-[3px]
              focus-visible:ring-[var(--focus-ring-soft)]"
          >
            <span className="text-color-text-secondary font-semibold">Trier par</span>
            <span>{sortLabel}</span>
            <Icon name="chevron-right" size={14} className="rotate-90" aria-hidden />
          </button>
          {sortOpen && (
            <ul
              role="listbox"
              aria-label="Trier par"
              className="absolute right-0 mt-space-1 z-10 min-w-[200px] bg-gj-surface
                border-[1.5px] border-gj-line rounded-gj-md shadow-lg overflow-hidden"
            >
              {SORT_OPTIONS.map((opt) => {
                const selected = opt.value === sortBy
                return (
                  <li key={opt.value} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onSortChange(opt.value)
                        setSortOpen(false)
                      }}
                      className={`w-full text-left px-space-3 py-space-2 text-fs-300
                        transition-colors hover:bg-gj-bg
                        focus:outline-none focus-visible:bg-gj-bg
                        ${selected ? 'font-black text-gj-teal-deep' : 'text-color-text-primary'}`}
                    >
                      {opt.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Titre dynamique + meta + chips */}
      <div className="flex items-start justify-between gap-space-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-black leading-tight text-color-text-primary">
            {total} opportunité{total !== 1 ? 's' : ''}
            {activeQuery ? (
              <>
                {' · '}
                <span className="text-color-text-primary">«&nbsp;</span>
                <span className="text-gj-teal-deep">{activeQuery}</span>
                <span className="text-color-text-primary">&nbsp;»</span>
              </>
            ) : null}
          </h1>
          <p className="text-fs-200 text-color-text-secondary mt-space-1" aria-live="polite">
            {activeCount > 0 ? (
              <>
                {activeCount} filtre{activeCount > 1 ? 's' : ''} actif
                {activeCount > 1 ? 's' : ''}
              </>
            ) : (
              <>Aucun filtre actif</>
            )}
            {updatedAgo ? <> · Mis à jour {updatedAgo}</> : null}
          </p>
        </div>

        {activeChips.length > 0 && (
          <ul
            className="flex flex-wrap gap-space-1 max-w-full"
            aria-label="Filtres actifs"
          >
            {activeChips.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={c.onRemove}
                  aria-label={`Retirer le filtre ${c.label}`}
                  className="inline-flex items-center gap-1 px-space-2 py-[5px] rounded-gj-pill
                    bg-gj-teal-soft text-gj-teal-deep text-fs-100 font-bold
                    hover:bg-gj-teal/15 transition-colors
                    focus:outline-none focus-visible:ring-[3px]
                    focus-visible:ring-[var(--focus-ring-soft)]"
                >
                  {c.label}
                  <Icon name="close" size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
