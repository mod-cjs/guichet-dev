'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { Icon } from '@/components/ui/Icon'
import { CentresKpiCard } from '@/components/admin/CentresKpiCard'
import { CentresChartReservationsByDay } from '@/components/admin/CentresChartReservationsByDay'
import { CentresChartTopCentres } from '@/components/admin/CentresChartTopCentres'
import { CentresChartPie } from '@/components/admin/CentresChartPie'
import type { EvenementsAnalytics } from '@/lib/loaders/evenements-analytics'

// Calqué sur `CentresAnalyticsClient` (même chrome : sidebar filtres + KPI + charts).

interface Centre {
  id: string
  nom: string
}

interface Props {
  analytics: EvenementsAnalytics
  centres: Centre[]
  filtres: { from: string; to: string; centreIds: string[] }
}

type RangePreset = '7d' | '30d' | 'year' | 'custom'

const TYPE_LABEL: Record<string, string> = {
  Formation: 'Formation', Atelier: 'Atelier', Forum: 'Forum', Webinar: 'Webinaire', Conference: 'Conférence', Cours: 'Cours',
}
const STATUT_LABEL: Record<string, string> = {
  a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
}
const INSCR_LABEL: Record<string, string> = {
  inscrit: 'Inscrit', liste_attente: 'Liste d’attente', annule: 'Annulé', present: 'Présent',
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function presetToRange(preset: RangePreset): { from: string; to: string } | null {
  const now = new Date()
  const to = isoDay(now)
  if (preset === '7d') return { from: isoDay(new Date(now.getTime() - 7 * 86400_000)), to }
  if (preset === '30d') return { from: isoDay(new Date(now.getTime() - 30 * 86400_000)), to }
  if (preset === 'year') return { from: `${now.getUTCFullYear()}-01-01`, to }
  return null
}
function pct(v: number): string {
  return `${(v * 100).toFixed(1).replace(/\.0$/, '')} %`
}

export function EvenementsAnalyticsClient({ analytics, centres, filtres }: Props) {
  const router = useRouter()
  const [preset, setPreset] = useState<RangePreset>('custom')
  const [from, setFrom] = useState(filtres.from.slice(0, 10))
  const [to, setTo] = useState(filtres.to.slice(0, 10))
  const [centreId, setCentreId] = useState<string>(filtres.centreIds[0] ?? '')

  const exportHref = useMemo(() => {
    const qs = new URLSearchParams({ from, to })
    if (centreId) qs.set('centreId', centreId)
    return `/api/admin/analytics/evenements/export?${qs.toString()}`
  }, [from, to, centreId])

  function applyPreset(p: RangePreset) {
    setPreset(p)
    const r = presetToRange(p)
    if (r) { setFrom(r.from); setTo(r.to) }
  }
  function apply() {
    const qs = new URLSearchParams({ from, to })
    if (centreId) qs.set('centreId', centreId)
    router.push(`/admin/analytics/evenements?${qs.toString()}`)
  }
  function reset() {
    const r = presetToRange('30d')!
    setPreset('30d'); setFrom(r.from); setTo(r.to); setCentreId('')
    router.push('/admin/analytics/evenements')
  }

  const a = analytics

  return (
    <div className="flex flex-col md:flex-row gap-space-5">
      {/* Sidebar filtres */}
      <aside className="md:w-[260px] shrink-0">
        <Card padded>
          <div className="flex flex-col gap-space-3">
            <h2 className="text-fs-400 font-bold text-color-text-primary">Filtres</h2>

            <div className="flex flex-col gap-space-2">
              <FieldLabel htmlFor="preset">Période</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {(['7d', '30d', 'year', 'custom'] as const).map((p) => (
                  <Button key={p} type="button" variant={preset === p ? 'primary' : 'secondary'} size="sm" onClick={() => applyPreset(p)}>
                    {p === '7d' && '7 j'}{p === '30d' && '30 j'}{p === 'year' && 'Année'}{p === 'custom' && 'Custom'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-space-2">
              <FieldLabel htmlFor="from">Du</FieldLabel>
              <Input id="from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset('custom') }} />
              <FieldLabel htmlFor="to">Au</FieldLabel>
              <Input id="to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset('custom') }} />
            </div>

            <div className="flex flex-col gap-space-2">
              <FieldLabel htmlFor="centre">Centre</FieldLabel>
              <select
                id="centre"
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                className="w-full px-space-3 rounded-gj-md border-[1.5px] bg-white font-[inherit] text-[16px] min-h-[var(--tap-input)] border-gj-line focus:border-gj-teal-deep focus:outline-none focus:ring-[3px] focus:ring-[var(--focus-ring-soft)] cursor-pointer"
              >
                <option value="">Tous les centres</option>
                {centres.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-space-2">
              <Button type="button" onClick={apply}>Appliquer</Button>
              <Button type="button" variant="secondary" onClick={reset}>Réinitialiser</Button>
              <a
                href={exportHref}
                className="inline-flex items-center justify-center gap-2 text-fs-300 font-semibold text-gj-teal-deep border border-gj-teal rounded-gj-md px-space-3 py-space-2 no-underline hover:bg-gj-teal-soft"
                download
              >
                <Icon name="download" size={16} />
                Exporter CSV
              </a>
            </div>
          </div>
        </Card>
      </aside>

      {/* Zone principale */}
      <section className="flex-1 min-w-0 flex flex-col gap-space-5">
        <header>
          <h1 className="text-fs-800 font-black text-color-text-primary">Analytics Événements</h1>
          <p className="text-fs-300 text-color-text-secondary mt-space-1">
            Suivi des activités/événements — distinct de la fréquentation des centres.
            {' '}Période : {from} → {to}
            {centreId ? ` · ${centres.find((c) => c.id === centreId)?.nom ?? centreId}` : ' · Tous les centres'}
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-3">
          <CentresKpiCard label="Événements" value={a.totalEvenements.toLocaleString('fr-FR')} />
          <CentresKpiCard label="Inscriptions" value={a.totalInscriptions.toLocaleString('fr-FR')} variationLabel={`${a.participantsUniques} participants uniques`} />
          <CentresKpiCard label="Taux de présence" value={pct(a.tauxPresence)} />
          <CentresKpiCard label="Taux de remplissage" value={pct(a.tauxRemplissage)} />
        </div>

        {/* Tendance mensuelle */}
        <Card padded>
          <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">Événements par mois</h2>
          <CentresChartReservationsByDay data={a.parMois.map((m) => ({ date: m.mois, count: m.evenements }))} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-3">
          <Card padded>
            <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">Top 5 centres</h2>
            <CentresChartTopCentres data={a.topCentres.map((t) => ({ centreId: t.centreNom, centreNom: t.centreNom, count: t.evenements }))} />
          </Card>

          <Card padded>
            <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">Répartition par type</h2>
            <CentresChartPie data={a.parType.map((t) => ({ label: TYPE_LABEL[t.key] ?? t.key, count: t.count }))} variant="pie" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-3">
          <Card padded>
            <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">Par statut</h2>
            <CentresChartPie data={a.parStatut.map((s) => ({ label: STATUT_LABEL[s.key] ?? s.key, count: s.count }))} variant="donut" />
          </Card>

          <Card padded>
            <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">Inscriptions par statut</h2>
            <CentresChartPie data={a.inscriptionsParStatut.map((s) => ({ label: INSCR_LABEL[s.key] ?? s.key, count: s.count }))} variant="donut" />
          </Card>
        </div>
      </section>
    </div>
  )
}
