import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext, getAgendaRange, isoDay, startOfWeek, type AgendaItem } from '@/lib/loaders/conseiller'
import { AgendaDuJour } from '../agenda-du-jour'
import { WeekView, MonthView } from './agenda-views'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * GUIC-497 — Agenda conseiller multi-vues : Jour / Semaine / Mois.
 * Server-driven via `?vue=` et `?date=YYYY-MM-DD`. Agenda dérivé (Réservation +
 * Événement), aucun modèle RendezVous.
 */
type Vue = 'jour' | 'semaine' | 'mois'
const VUES: { id: Vue; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
]

function parseVue(v?: string): Vue { return v === 'semaine' || v === 'mois' ? v : 'jour' }
function parseDate(s?: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (!Number.isNaN(dt.getTime())) return dt
  }
  return new Date()
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

const CAP = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fmtJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtMois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const fmtJM = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

export default async function ConseillerAgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ vue?: string; date?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  const sp = (await searchParams) ?? {}
  const vue = parseVue(sp.vue)
  const ref = parseDate(sp.date)
  const refIso = isoDay(ref)
  const todayIso = isoDay(new Date())

  // Plage + libellé + navigation selon la vue
  let start: Date, end: Date, periodLabel: string, prevDate: string, nextDate: string
  let weekStart = startOfWeek(ref)
  let gridStart = weekStart
  let weeks = 1
  if (vue === 'jour') {
    start = new Date(ref); start.setHours(0, 0, 0, 0)
    end = endOfDay(ref)
    periodLabel = CAP(fmtJour.format(ref))
    prevDate = isoDay(addDays(ref, -1)); nextDate = isoDay(addDays(ref, 1))
  } else if (vue === 'semaine') {
    weekStart = startOfWeek(ref)
    start = weekStart; end = endOfDay(addDays(weekStart, 6))
    periodLabel = `${fmtJM.format(weekStart)} – ${CAP(fmtJour.format(addDays(weekStart, 6)))}`
    prevDate = isoDay(addDays(weekStart, -7)); nextDate = isoDay(addDays(weekStart, 7))
  } else {
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
    gridStart = startOfWeek(first)
    const gridEnd = addDays(startOfWeek(last), 6)
    weeks = Math.round((gridEnd.getTime() - gridStart.getTime()) / (7 * 864e5)) + 1
    start = gridStart; end = endOfDay(gridEnd)
    periodLabel = CAP(fmtMois.format(ref))
    prevDate = isoDay(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))
    nextDate = isoDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))
  }

  const items = await getAgendaRange(ctx.centreId, start, end)
  const byDay = new Map<string, AgendaItem[]>()
  for (const it of items) {
    const arr = byDay.get(it.date) ?? []
    arr.push(it); byDay.set(it.date, arr)
  }

  const navLink = (date: string) => `/conseiller/agenda?vue=${vue}&date=${date}`

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: vue === 'jour' ? 760 : 1040, margin: '0 auto' }}>
      <div className="flex items-end justify-between gap-space-3 flex-wrap">
        <div>
          <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Agenda &amp; RDV</h1>
          <p className="inline-flex items-center gap-space-1 text-gj-teal-deep font-semibold" style={{ fontSize: 12, marginTop: 3 }}>
            <Icon name="pin" size={13} />{ctx.centreNom}
          </p>
        </div>
        {/* Sélecteur de vue */}
        <div className="flex gap-space-1 bg-white" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: 4 }} role="tablist" aria-label="Type de vue">
          {VUES.map((v) => {
            const on = v.id === vue
            return (
              <Link key={v.id} href={`/conseiller/agenda?vue=${v.id}&date=${refIso}`} role="tab" aria-selected={on} className="no-underline font-extrabold" style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12.5, background: on ? 'var(--gj-teal-deep)' : 'transparent', color: on ? '#fff' : 'var(--gj-grey)' }}>
                {v.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Barre de navigation période */}
      <div className="flex items-center gap-space-3 flex-wrap">
        <Link href={navLink(prevDate)} aria-label="Période précédente" className="inline-flex items-center justify-center no-underline" style={{ width: 38, height: 38, borderRadius: 9, border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}>
          <Icon name="chevron-left" size={18} />
        </Link>
        <Link href={navLink(nextDate)} aria-label="Période suivante" className="inline-flex items-center justify-center no-underline" style={{ width: 38, height: 38, borderRadius: 9, border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}>
          <Icon name="chevron-right" size={18} />
        </Link>
        <Link href={`/conseiller/agenda?vue=${vue}&date=${todayIso}`} className="no-underline font-extrabold" style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid var(--gj-line)', color: 'var(--gj-teal-deep)', fontSize: 12.5 }}>
          Aujourd&apos;hui
        </Link>
        <span className="font-black text-color-text-primary" style={{ fontSize: 15 }}>{periodLabel}</span>
      </div>

      {/* Vue */}
      {vue === 'jour' && <AgendaDuJour items={byDay.get(refIso) ?? []} title={periodLabel} showMore={false} />}
      {vue === 'semaine' && <WeekView weekStart={weekStart} byDay={byDay} todayIso={todayIso} />}
      {vue === 'mois' && <MonthView gridStart={gridStart} weeks={weeks} refMonth={ref.getMonth()} byDay={byDay} todayIso={todayIso} />}
    </div>
  )
}
