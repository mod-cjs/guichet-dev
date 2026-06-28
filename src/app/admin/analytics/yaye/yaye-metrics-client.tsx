'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import type { RollupResult } from '@/lib/ia/metrics/rollups'
import type { FeedbackKpis } from '@/lib/ia/metrics/feedback'
import type { OutcomeResult } from '@/lib/ia/metrics/outcomes'
import type { YqsGlobal } from '@/lib/ia/metrics/yqs'
import type { RegressionReport } from '@/lib/ia/metrics/regression-data'
import type { CalibrationReport } from '@/lib/ia/metrics/calibration-data'

interface Filtres {
  from: string
  to: string
  canal: 'tous' | 'web' | 'whatsapp'
}

interface Props {
  rollups: RollupResult
  feedback: FeedbackKpis
  outcomes: OutcomeResult
  yqs: YqsGlobal
  regression: RegressionReport
  calibration: CalibrationReport | null
  filtres: Filtres
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)} %`
}
function ms(x: number): string {
  if (!x) return '—'
  return x >= 1000 ? `${(x / 1000).toFixed(2)} s` : `${Math.round(x)} ms`
}

function Kpi({
  label,
  value,
  hint,
  ton,
}: {
  label: string
  value: string
  hint?: string
  ton?: 'bon' | 'alerte' | 'neutre'
}) {
  const accent = ton === 'bon' ? 'green' : ton === 'alerte' ? 'red' : 'grey'
  return (
    <Card className="flex flex-col gap-space-1">
      <span className="text-fs-200 text-color-text-secondary">{label}</span>
      <div className="flex items-baseline gap-space-2">
        <span className="text-fs-600 font-bold text-color-text-primary">{value}</span>
        {ton && <Badge variant={accent === 'green' ? 'green' : accent === 'red' ? 'red' : 'grey'}>{ton}</Badge>}
      </div>
      {hint && <span className="text-fs-100 text-color-text-secondary">{hint}</span>}
    </Card>
  )
}

export function YayeMetricsClient({ rollups, feedback, outcomes, yqs, regression, calibration, filtres }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(filtres.from)
  const [to, setTo] = useState(filtres.to)
  const [canal, setCanal] = useState<Filtres['canal']>(filtres.canal)

  const appliquer = () => {
    const q = new URLSearchParams({ from, to })
    if (canal !== 'tous') q.set('canal', canal)
    router.push(`/admin/analytics/yaye?${q.toString()}`)
  }

  // Seuils indicatifs (calibrables) pour colorer les KPI critiques.
  const tonEscalade = rollups.tauxEscalade > 0.2 ? 'alerte' : 'bon'
  const tonAbandon = rollups.tauxAbandon > 0.15 ? 'alerte' : 'bon'
  const tonSeche = rollups.tauxRequeteSeche > 0.25 ? 'alerte' : 'neutre'
  const tonSucces = rollups.tauxSuccesOutil < 0.9 ? 'alerte' : 'bon'

  const distEntries = Object.entries(rollups.profondeurBoucle.distribution).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )
  const distMax = Math.max(1, ...distEntries.map(([, n]) => n))

  return (
    <div className="flex flex-col gap-space-5 p-space-4">
      <PageHeader
        title="Métriques conversationnelles — Yaye"
        subtitle="5 couches → Yaye Quality Score. Sources : agent_logs, feedback, juge LLM, métier. GUIC-435."
      />

      {/* YQS — la note composite */}
      <Card className="flex flex-wrap items-center gap-space-4">
        <div className="flex flex-col">
          <span className="text-fs-200 text-color-text-secondary">Yaye Quality Score</span>
          <span className="text-[44px] leading-none font-black text-color-text-primary">
            {yqs.yqs == null ? '—' : `${yqs.yqs}`}
            <span className="text-fs-300 text-color-text-secondary font-bold"> / 100</span>
          </span>
        </div>
        <div className="flex flex-col gap-space-1 min-w-[220px]">
          {yqs.drapeauRouge ? (
            <Badge variant="red">
              ⚠ Drapeau rouge — {yqs.plafonne ? 'YQS plafonné' : 'garde-fou déclenché'}
            </Badge>
          ) : (
            <Badge variant="green">Garde-fous OK</Badge>
          )}
          <span className="text-fs-100 text-color-text-secondary">
            Fidélité moy. {yqs.qualite.fidelite == null ? '—' : pct(yqs.qualite.fidelite)} · Conformité CDP{' '}
            {yqs.qualite.conformiteCdp == null ? '—' : pct(yqs.qualite.conformiteCdp)} ·{' '}
            {yqs.qualite.count} conversation(s) jugée(s)
          </span>
        </div>
        <div className="flex flex-wrap gap-space-3 ml-auto text-fs-100 text-color-text-secondary">
          {(
            [
              ['Opérationnel', yqs.couches.operationnel],
              ['Efficacité', yqs.couches.efficacite],
              ['Qualité', yqs.couches.qualite],
              ['Résultat', yqs.couches.resultat],
              ['Satisfaction', yqs.couches.satisfaction],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="flex flex-col items-center">
              <span className="font-bold text-color-text-primary">{v == null ? '—' : pct(v)}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Filtres */}
      <Card className="flex flex-wrap items-end gap-space-3">
        <div className="flex flex-col gap-space-1">
          <label htmlFor="from" className="text-fs-300 font-bold">Du</label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-space-1">
          <label htmlFor="to" className="text-fs-300 font-bold">Au</label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select
          label="Canal"
          value={canal}
          onChange={(e) => setCanal(e.target.value as Filtres['canal'])}
          options={[
            { value: 'tous', label: 'Tous' },
            { value: 'web', label: 'Web' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ]}
        />
        <Button onClick={appliquer}>Appliquer</Button>
        <span className="text-fs-200 text-color-text-secondary ml-auto">
          {rollups.sessions} session{rollups.sessions > 1 ? 's' : ''} sur la période
        </span>
      </Card>

      {/* Couche 1 — Opérationnel */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Couche 1 — Opérationnel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-3">
          <Kpi label="Latence par tour (P50)" value={ms(rollups.latenceTourMs.p50)} hint={`P95 ${ms(rollups.latenceTourMs.p95)}`} />
          <Kpi label="Taux de succès outil" value={pct(rollups.tauxSuccesOutil)} ton={tonSucces} />
          <Kpi label="Taux d'erreur moteur" value={pct(rollups.tauxErreurMoteur)} ton={rollups.tauxErreurMoteur > 0.1 ? 'alerte' : 'bon'} />
          <Kpi label="Requêtes graphe sèches" value={pct(rollups.tauxRequeteSeche)} hint="graphe sans résultat" ton={tonSeche} />
        </div>
      </section>

      {/* Couche 2 — Efficacité conversationnelle */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Couche 2 — Efficacité conversationnelle</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-3">
          <Kpi label="Tours / session (P50)" value={String(rollups.toursParSession.p50)} hint={`moy. ${rollups.toursParSession.moyenne}`} />
          <Kpi label="Taux de confinement" value={pct(rollups.tauxConfinement)} hint="sans escalade" ton={rollups.tauxConfinement < 0.8 ? 'alerte' : 'bon'} />
          <Kpi label="Taux d'escalade" value={pct(rollups.tauxEscalade)} ton={tonEscalade} />
          <Kpi label="Taux d'abandon" value={pct(rollups.tauxAbandon)} hint="aucun contenu transmis" ton={tonAbandon} />
        </div>
      </section>

      {/* Couche 4 — Résultat métier */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Couche 4 — Résultat métier</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-3">
          <Kpi
            label="Conversion reco→candidature"
            value={outcomes.tauxConversionReco == null ? '—' : pct(outcomes.tauxConversionReco)}
            hint={`${outcomes.recosConverties}/${outcomes.recosVues} recos vues`}
            ton={outcomes.tauxConversionReco == null ? 'neutre' : outcomes.tauxConversionReco < 0.1 ? 'alerte' : 'bon'}
          />
          <Kpi label="Candidatures via Yaye" value={String(outcomes.candidaturesViaYaye)} />
          <Kpi label="Réservations via Yaye" value={String(outcomes.reservationsViaYaye)} />
        </div>
      </section>

      {/* Couche 5 — Satisfaction (feedback explicite) */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Couche 5 — Satisfaction</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-3">
          <Kpi
            label="CSAT"
            value={feedback.csat == null ? '—' : pct(feedback.csat)}
            hint={`${feedback.total} retour${feedback.total > 1 ? 's' : ''}`}
            ton={feedback.csat == null ? 'neutre' : feedback.csat < 0.7 ? 'alerte' : 'bon'}
          />
          <Kpi label="👍 Utiles" value={String(feedback.positifs)} />
          <Kpi label="👎 Pas utiles" value={String(feedback.negatifs)} />
        </div>
      </section>

      {/* Profondeur de boucle */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Profondeur de boucle (tool-rounds)</h2>
        <Card className="flex flex-col gap-space-2">
          <span className="text-fs-200 text-color-text-secondary">
            Moyenne {rollups.profondeurBoucle.moyenne} round(s). Proche de 4 = Yaye « patine ».
          </span>
          {distEntries.length === 0 ? (
            <span className="text-fs-200 text-color-text-secondary">Aucune donnée.</span>
          ) : (
            distEntries.map(([rounds, n]) => (
              <div key={rounds} className="flex items-center gap-space-2">
                <span className="w-[80px] text-fs-200">{rounds} round{Number(rounds) > 1 ? 's' : ''}</span>
                <div className="flex-1 h-[14px] bg-gj-line rounded-gj-sm overflow-hidden">
                  <div
                    className="h-full bg-gj-teal"
                    style={{ width: `${Math.round((n / distMax) * 100)}%` }}
                  />
                </div>
                <span className="w-[48px] text-right text-fs-200">{n}</span>
              </div>
            ))
          )}
        </Card>
      </section>

      {/* Ventilation par canal */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Ventilation par canal</h2>
        <Card>
          <table className="w-full text-fs-300">
            <thead>
              <tr className="text-left text-color-text-secondary">
                <th className="py-space-1">Canal</th>
                <th className="py-space-1">Sessions</th>
                <th className="py-space-1">Taux d'escalade</th>
                <th className="py-space-1">Latence P50</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rollups.parCanal).map(([c, v]) => (
                <tr key={c} className="border-t border-gj-line">
                  <td className="py-space-2 font-bold capitalize">{c}</td>
                  <td className="py-space-2">{v.sessions}</td>
                  <td className="py-space-2">{pct(v.tauxEscalade)}</td>
                  <td className="py-space-2">{ms(v.latenceP50Ms)}</td>
                </tr>
              ))}
              {Object.keys(rollups.parCanal).length === 0 && (
                <tr><td colSpan={4} className="py-space-2 text-color-text-secondary">Aucune session.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Garde anti-régression (vs baseline figée par le cron nocturne) */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Garde anti-régression</h2>
        <Card className="flex flex-col gap-space-2">
          {regression.baseline == null ? (
            <span className="text-fs-200 text-color-text-secondary">
              Aucune baseline figée pour l'instant — elle sera initialisée au prochain passage du cron <code>yaye-eval</code>.
            </span>
          ) : (
            <>
              <div className="flex items-center gap-space-2 flex-wrap">
                {regression.result?.regressed ? (
                  <Badge variant="red">Régression détectée</Badge>
                ) : (
                  <Badge variant="green">Stable vs baseline</Badge>
                )}
                <span className="text-fs-100 text-color-text-secondary">
                  Baseline figée le {new Date(regression.baseline.calculeLe).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-3">
                <Delta label="YQS" current={regression.current.yqs} base={regression.baseline.yqs} suffix=" pts" />
                <Delta label="Fidélité" current={regression.current.fidelite} base={regression.baseline.fidelite} ratio />
                <Delta label="Conformité CDP" current={regression.current.conformiteCdp} base={regression.baseline.conformiteCdp} ratio />
                <Delta label="Précision d'intention" current={regression.current.intentPrecision} base={regression.baseline.intentPrecision} ratio />
              </div>
              {regression.result && regression.result.raisons.length > 0 && (
                <ul className="text-fs-100 text-gj-red-ink list-disc pl-space-4">
                  {regression.result.raisons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </>
          )}
        </Card>
      </section>

      {/* Calibration juge↔humain (Cohen's kappa par dimension) */}
      <section className="flex flex-col gap-space-3">
        <h2 className="text-fs-400 font-bold">Calibration juge↔humain</h2>
        <Card className="flex flex-col gap-space-2">
          {calibration == null ? (
            <span className="text-fs-200 text-color-text-secondary">
              En attente de labels humains. Un conseiller note quelques sessions (ligne <code>yaye_eval_scores</code> avec
              {' '}<code>juge</code> préfixé <code>humain:</code>) → l'accord par dimension s'affiche ici.
            </span>
          ) : (
            <>
              <div className="flex items-center gap-space-2 flex-wrap">
                <Badge variant={calibration.global >= 0.6 ? 'green' : 'red'}>
                  Kappa global {calibration.global.toFixed(2)}
                </Badge>
                <span className="text-fs-100 text-color-text-secondary">
                  {calibration.pairs} session{calibration.pairs > 1 ? 's' : ''} doublement notée{calibration.pairs > 1 ? 's' : ''}
                  {calibration.faibles.length > 0 && ` · accord faible : ${calibration.faibles.join(', ')}`}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-space-3">
                {Object.entries(calibration.parDimension).map(([dim, k]) => (
                  <Kpi key={dim} label={dim} value={k.toFixed(2)} ton={k >= 0.6 ? 'bon' : 'alerte'} />
                ))}
              </div>
            </>
          )}
        </Card>
      </section>
    </div>
  )
}

/** Affiche une valeur courante et son écart à la baseline (régression). */
function Delta({
  label,
  current,
  base,
  ratio,
  suffix = '',
}: {
  label: string
  current: number | null
  base: number | null
  ratio?: boolean
  suffix?: string
}) {
  const fmt = (x: number | null) => (x == null ? '—' : ratio ? `${(x * 100).toFixed(1)} %` : `${x}${suffix}`)
  const d = current != null && base != null ? current - base : null
  const dStr = d == null ? '—' : `${d >= 0 ? '+' : ''}${ratio ? (d * 100).toFixed(1) + ' pts' : d.toFixed(1) + suffix}`
  return (
    <Card className="flex flex-col gap-space-1">
      <span className="text-fs-200 text-color-text-secondary">{label}</span>
      <span className="text-fs-500 font-bold text-color-text-primary">{fmt(current)}</span>
      <span className={`text-fs-100 ${d == null ? 'text-color-text-secondary' : d < 0 ? 'text-gj-red-ink' : 'text-gj-green-ink'}`}>
        {dStr} vs baseline
      </span>
    </Card>
  )
}
