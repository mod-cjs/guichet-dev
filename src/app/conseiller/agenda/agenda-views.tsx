import Link from 'next/link'
import { isoDay, type AgendaItem } from '@/lib/loaders/conseiller'

/**
 * GUIC-497 — Vues Semaine / Mois de l'agenda conseiller (présentational, server).
 * La vue Jour réutilise <AgendaDuJour /> (timeline).
 */

const WD_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const WD_MIN = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function dot(atelier: boolean) {
  return atelier ? 'var(--gj-yellow-deep, var(--gj-yellow))' : 'var(--gj-teal)'
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function href(vue: string, date: string) { return `/conseiller/agenda?vue=${vue}&date=${date}` }

// ── Semaine (7 colonnes empilées en mobile) ───────────────────────────────
export function WeekView({ weekStart, byDay, todayIso }: { weekStart: Date; byDay: Map<string, AgendaItem[]>; todayIso: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  return (
    <div className="grid gap-space-2" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
      <div className="hidden md:grid gap-space-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d, i) => <WeekCol key={i} d={d} i={i} byDay={byDay} todayIso={todayIso} />)}
      </div>
      <div className="md:hidden flex flex-col gap-space-2">
        {days.map((d, i) => <WeekCol key={i} d={d} i={i} byDay={byDay} todayIso={todayIso} stacked />)}
      </div>
    </div>
  )
}

function WeekCol({ d, i, byDay, todayIso, stacked }: { d: Date; i: number; byDay: Map<string, AgendaItem[]>; todayIso: string; stacked?: boolean }) {
  const iso = isoDay(d)
  const items = byDay.get(iso) ?? []
  const today = iso === todayIso
  return (
    <div className="bg-white rounded-gj-md" style={{ border: `1.5px solid ${today ? 'var(--gj-teal-deep)' : 'var(--gj-line)'}`, minHeight: stacked ? undefined : 150 }}>
      <Link href={href('jour', iso)} className="no-underline flex items-center justify-between px-space-2 py-space-2" style={{ borderBottom: '1px solid var(--gj-line)', background: today ? 'var(--gj-teal-soft)' : 'var(--gj-bg)' }}>
        <span className="font-extrabold" style={{ fontSize: 11, color: today ? 'var(--gj-teal-deep)' : 'var(--gj-grey)' }}>{WD_SHORT[i]}</span>
        <span className="font-black" style={{ fontSize: 13, color: today ? 'var(--gj-teal-deep)' : 'var(--gj-ink)' }}>{d.getDate()}</span>
      </Link>
      <div className="flex flex-col gap-space-1 p-space-2">
        {items.length === 0 ? (
          <span className="text-color-text-secondary" style={{ fontSize: 11 }}>—</span>
        ) : items.map((it) => (
          <div key={it.id} className="flex items-start gap-space-1" style={{ fontSize: 11 }}>
            <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: dot(it.atelier), marginTop: 4 }} />
            <span className="min-w-0">
              <span className="font-bold text-color-text-primary tabular-nums">{it.time}</span>{' '}
              <span className="text-color-text-secondary">{it.label}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mois (grille calendrier) ──────────────────────────────────────────────
export function MonthView({ gridStart, weeks, refMonth, byDay, todayIso }: { gridStart: Date; weeks: number; refMonth: number; byDay: Map<string, AgendaItem[]>; todayIso: string }) {
  return (
    <div className="bg-white rounded-gj-lg overflow-hidden" style={{ border: '1.5px solid var(--gj-line)' }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--gj-bg)', borderBottom: '1.5px solid var(--gj-line)' }}>
        {WD_SHORT.map((w, i) => (
          <div key={i} className="text-center font-extrabold py-space-2" style={{ fontSize: 10.5, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            <span className="hidden sm:inline">{w}</span><span className="sm:hidden">{WD_MIN[i]}</span>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: weeks * 7 }, (_, k) => addDays(gridStart, k)).map((d, k) => {
          const iso = isoDay(d)
          const items = byDay.get(iso) ?? []
          const inMonth = d.getMonth() === refMonth
          const today = iso === todayIso
          return (
            <Link key={k} href={href('jour', iso)} className="no-underline flex flex-col gap-[2px] p-space-1" style={{ minHeight: 84, borderRight: (k % 7 !== 6) ? '1px solid var(--gj-line)' : undefined, borderBottom: '1px solid var(--gj-line)', background: inMonth ? '#fff' : 'var(--gj-bg)', opacity: inMonth ? 1 : 0.6 }}>
              <span className="self-end inline-flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: today ? 900 : 700, background: today ? 'var(--gj-teal-deep)' : 'transparent', color: today ? '#fff' : 'var(--gj-ink)' }}>{d.getDate()}</span>
              {items.slice(0, 2).map((it) => (
                <span key={it.id} className="flex items-center gap-[3px] min-w-0" style={{ fontSize: 9.5 }}>
                  <span className="shrink-0" style={{ width: 5, height: 5, borderRadius: '50%', background: dot(it.atelier) }} />
                  <span className="truncate text-color-text-secondary">{it.time} {it.label}</span>
                </span>
              ))}
              {items.length > 2 && <span style={{ fontSize: 9.5, color: 'var(--gj-teal-deep)', fontWeight: 800 }}>+{items.length - 2}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
