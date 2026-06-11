'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Icon, Sheet, Badge } from '@/components/ui'
import { EventCard } from './EventCard'
import type { EvenementListItem, TypeEvenementValue } from '@/lib/loaders/evenements'

// GUIC-23 — M5 · Vue calendrier mensuel des événements.

interface AgendaCalendrierProps {
  events: EvenementListItem[]
  mois: Date
  onMoisChange: (mois: Date) => void
  /** Callback CTA inscription propagé aux EventCard ouvertes dans la bottom-sheet. */
  onInscrire?: (id: string) => void
  /**
   * GUIC-374 — état session/inscriptions propagé aux EventCard du panel jour.
   * Sans ces props, EventCard affichait toujours « Se connecter pour s'inscrire »
   * même quand l'utilisateur était connecté.
   */
  isAuthenticated?: boolean
  inscriptions?: Set<string>
  pendingId?: string | null
}

const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const FULL_DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const WEEKDAYS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** Couleur de pastille selon le type d'événement. */
const TYPE_PASTILLE: Record<TypeEvenementValue, string> = {
  Formation:  'bg-gj-teal',
  Atelier:    'bg-gj-yellow',
  Forum:      'bg-gj-blue',
  Webinar:    'bg-gj-green',
  Conference: 'bg-gj-red',
}

/** Index ISO 0..6 (lundi=0) du jour de la semaine. */
function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** Compare deux dates sur leur seule partie civile (Y/M/D, fuseau local). */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface CellInfo {
  date: Date
  inMonth: boolean
  events: EvenementListItem[]
}

/**
 * Construit la grille 7×N (N=5 ou 6) du mois donné, commençant un lundi.
 * Inclut les jours « hors-mois » des semaines de bord pour conserver une
 * grille rectangulaire propre.
 */
function buildGrid(mois: Date, events: EvenementListItem[]): CellInfo[] {
  const year = mois.getFullYear()
  const month = mois.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)

  // Reculer jusqu'au lundi précédent (inclus).
  const start = new Date(firstOfMonth)
  start.setDate(start.getDate() - isoWeekday(firstOfMonth))

  // Avancer jusqu'au dimanche suivant la fin du mois.
  const end = new Date(lastOfMonth)
  end.setDate(end.getDate() + (6 - isoWeekday(lastOfMonth)))

  // Pré-indexe les événements par "YYYY-MM-DD" pour O(1) lookup.
  const byDay = new Map<string, EvenementListItem[]>()
  for (const ev of events) {
    const d = new Date(ev.dateDebut)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const arr = byDay.get(key) ?? []
    arr.push(ev)
    byDay.set(key, arr)
  }

  const cells: CellInfo[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
    cells.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === month,
      events: byDay.get(key) ?? [],
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return cells
}

/**
 * Calendrier mensuel — grille 7 colonnes, navigation mois ◀ ▶, pastilles
 * colorées par type, click jour → panel latéral (desktop) / bottom-sheet (mobile)
 * listant les events du jour.
 *
 * A11y :
 * - `role="grid"` + cells `role="gridcell"`
 * - navigation clavier Flèches (←/→/↑/↓) déplace le focus d'une cellule à l'autre
 * - Enter/Space ouvre la bottom-sheet du jour focalisé
 * - libellés courts (« L M M J V S D ») doublés via aria-label long
 */
export function AgendaCalendrier({
  events,
  mois,
  onMoisChange,
  onInscrire,
  isAuthenticated = false,
  inscriptions,
  pendingId = null,
}: AgendaCalendrierProps) {
  const today = useMemo(() => new Date(), [])
  const cells = useMemo(() => buildGrid(mois, events), [mois, events])
  const [openDay, setOpenDay] = useState<Date | null>(null)
  const [focusIndex, setFocusIndex] = useState<number>(() => {
    // Focus initial sur aujourd'hui si présent dans la grille, sinon 1er du mois.
    const todayIdx = cells.findIndex((c) => sameDay(c.date, today))
    if (todayIdx !== -1) return todayIdx
    return cells.findIndex((c) => c.inMonth)
  })
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Quand le mois change (clic ◀ ▶), recalibre focusIndex sur le 1er du nouveau
  // mois afin que le tabIndex roving reste cohérent avec la grille rebuild.
  // Sinon un focusIndex hérité de l'ancienne grille pointe vers une autre date.
  const moisKey = `${mois.getFullYear()}-${mois.getMonth()}`
  const prevMoisKeyRef = useRef(moisKey)
  // Bloque le focus auto sur changement de mois (l'utilisateur est sur le bouton
  // ◀ ▶, on ne lui vole pas le focus). Le tabIndex roving est resynchronisé sur
  // le 1er du nouveau mois pour rester logique au prochain Tab.
  const skipFocusRef = useRef(false)
  if (prevMoisKeyRef.current !== moisKey) {
    prevMoisKeyRef.current = moisKey
    const firstInMonth = cells.findIndex((c) => c.inMonth)
    if (firstInMonth !== -1 && firstInMonth !== focusIndex) {
      skipFocusRef.current = true
      // setState pendant le render est OK : React batch et évite la double-pass.
      setFocusIndex(firstInMonth)
    }
  }

  // Ne se déclenche que lors d'un changement explicite de focusIndex via clavier
  // (Arrow/Enter). On neutralise le 1er render et les changements de mois.
  const hasMountedRef = useRef(false)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (skipFocusRef.current) {
      skipFocusRef.current = false
      return
    }
    cellRefs.current[focusIndex]?.focus({ preventScroll: true })
  }, [focusIndex])

  const goPrev = useCallback(() => {
    const d = new Date(mois)
    d.setMonth(d.getMonth() - 1)
    onMoisChange(d)
  }, [mois, onMoisChange])
  const goNext = useCallback(() => {
    const d = new Date(mois)
    d.setMonth(d.getMonth() + 1)
    onMoisChange(d)
  }, [mois, onMoisChange])

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let next = idx
    switch (e.key) {
      case 'ArrowLeft':  next = idx - 1; break
      case 'ArrowRight': next = idx + 1; break
      case 'ArrowUp':    next = idx - 7; break
      case 'ArrowDown':  next = idx + 7; break
      case 'Enter':
      case ' ':
        e.preventDefault()
        setOpenDay(cells[idx].date)
        return
      default:
        return
    }
    if (next >= 0 && next < cells.length) {
      e.preventDefault()
      setFocusIndex(next)
    }
  }

  const moisLabel = MONTH_FMT.format(mois)
  // Capitalise la première lettre ("juin 2026" → "Juin 2026")
  const moisLabelCap = moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1)

  const dayEvents = openDay
    ? events.filter((ev) => sameDay(new Date(ev.dateDebut), openDay))
    : []

  return (
    <div className="flex flex-col gap-space-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          aria-label="Mois précédent"
        >
          <Icon name="chevron-left" size={18} />
        </Button>
        <h2
          className="text-fs-500 font-black text-color-text-primary capitalize"
          aria-live="polite"
        >
          {moisLabelCap}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          aria-label="Mois suivant"
        >
          <Icon name="chevron-right" size={18} />
        </Button>
      </div>

      <div
        role="grid"
        aria-label={`Calendrier ${moisLabelCap}`}
        className="grid grid-cols-7 gap-1 md:gap-2"
      >
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            role="columnheader"
            aria-label={WEEKDAYS_LONG[i]}
            className="text-center text-fs-100 font-bold text-color-text-secondary py-space-1"
          >
            {d}
          </div>
        ))}

        {cells.map((cell, idx) => {
          const isToday = sameDay(cell.date, today)
          const hasEvents = cell.events.length > 0
          const visible = cell.events.slice(0, 3)
          const extra = cell.events.length - visible.length
          const longLabel = FULL_DATE_FMT.format(cell.date) +
            (hasEvents ? ` — ${cell.events.length} événement${cell.events.length > 1 ? 's' : ''}` : '')

          return (
            <button
              key={cell.date.toISOString()}
              ref={(el) => { cellRefs.current[idx] = el }}
              role="gridcell"
              type="button"
              aria-label={longLabel}
              aria-current={isToday ? 'date' : undefined}
              tabIndex={idx === focusIndex ? 0 : -1}
              onClick={() => {
                setFocusIndex(idx)
                if (hasEvents) setOpenDay(cell.date)
              }}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={[
                'min-h-[56px] md:min-h-[80px] rounded-gj-md p-1 md:p-2 flex flex-col items-start',
                'text-left transition-colors',
                cell.inMonth ? 'bg-white' : 'bg-gj-line/30 text-color-text-muted',
                isToday ? 'border-2 border-gj-teal' : 'border border-gj-line',
                hasEvents ? 'cursor-pointer hover:bg-gj-teal-soft/40' : 'cursor-default',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal',
              ].join(' ')}
            >
              <span
                className={[
                  'text-fs-200 font-bold leading-none mb-1',
                  isToday ? 'text-gj-teal-deep' : '',
                ].join(' ')}
              >
                {cell.date.getDate()}
              </span>
              {hasEvents && (
                <span className="flex flex-wrap items-center gap-1 mt-auto" aria-hidden>
                  {visible.map((ev) => (
                    <span
                      key={ev.id}
                      className={`inline-block w-2 h-2 rounded-full ${TYPE_PASTILLE[ev.type]}`}
                      title={ev.titre}
                    />
                  ))}
                  {extra > 0 && (
                    <span className="text-fs-100 font-bold text-color-text-secondary ml-0.5">
                      +{extra}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Sheet
        isOpen={openDay !== null}
        onClose={() => setOpenDay(null)}
        title={openDay ? FULL_DATE_FMT.format(openDay) : ''}
        variant="side"
      >
        {dayEvents.length === 0 ? (
          <p className="text-fs-300 text-color-text-secondary py-space-3">
            Aucun événement ce jour.
          </p>
        ) : (
          <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
            {dayEvents.map((ev) => (
              <li key={ev.id} className="flex flex-col gap-space-1">
                <EventCard
                  item={ev}
                  onInscrire={onInscrire}
                  isAuthenticated={isAuthenticated}
                  isInscrit={inscriptions?.has(ev.id) ?? false}
                  isPending={pendingId === ev.id}
                />
                <Badge variant="teal" className="self-start md:hidden">
                  {ev.type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
