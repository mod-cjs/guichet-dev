'use client'

import { Icon } from '@/components/ui/Icon'
import type { EvenementsAnalytics } from '@/lib/loaders/evenements-analytics'

const TYPE_LABEL: Record<string, string> = {
  Formation: 'Formation', Atelier: 'Atelier', Forum: 'Forum', Webinar: 'Webinaire', Conference: 'Conférence',
}
const STATUT_LABEL: Record<string, string> = {
  a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
}
const INSCR_LABEL: Record<string, string> = {
  inscrit: 'Inscrit', liste_attente: 'Liste d’attente', annule: 'Annulé', present: 'Présent',
}

export interface EvenementsAnalyticsClientProps {
  analytics: EvenementsAnalytics
  centres: { id: string; nom: string }[]
  filtres: { from: string; to: string; centreIds: string[] }
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function Tile({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] p-[16px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center gap-[8px]" style={{ color: 'var(--gj-grey)' }}>
        <Icon name={icon as never} size={16} />
        <span className="text-[12px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-[26px] font-black mt-[6px]" style={{ color: 'var(--gj-ink)' }}>{value}</p>
      {hint && <p className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>{hint}</p>}
    </div>
  )
}

function Bars({ title, items, labels }: { title: string; items: { key: string; count: number }[]; labels: Record<string, string> }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <div className="rounded-[14px] p-[16px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>{title}</h2>
      {items.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune donnée sur la période.</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {items.map((i) => (
            <div key={i.key} className="flex items-center gap-[10px]">
              <span className="text-[12.5px] font-bold shrink-0" style={{ width: 120, color: 'var(--gj-grey)' }}>{labels[i.key] ?? i.key}</span>
              <div className="flex-1 rounded-full h-[10px]" style={{ background: 'var(--gj-bg)' }}>
                <div className="h-[10px] rounded-full" style={{ width: `${(i.count / max) * 100}%`, background: 'var(--gj-teal)' }} />
              </div>
              <span className="text-[12.5px] font-black shrink-0" style={{ width: 40, textAlign: 'right', color: 'var(--gj-ink)' }}>{i.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Analytics ÉVÉNEMENTS (GUIC-472) — destination distincte de la fréquentation centres. */
export function EvenementsAnalyticsClient({ analytics, centres, filtres }: EvenementsAnalyticsClientProps) {
  const a = analytics
  const exportQuery = new URLSearchParams({ from: filtres.from.slice(0, 10), to: filtres.to.slice(0, 10) })
  if (filtres.centreIds.length) exportQuery.set('centreId', filtres.centreIds.join(','))

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div className="mb-4">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Analytics événements</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
            Suivi des activités/événements — distinct de la fréquentation des centres (check-ins).
          </p>
        </div>

        {/* Filtres (form GET natif) + export */}
        <form method="GET" className="flex items-end gap-[10px] flex-wrap mb-4">
          <label className="flex flex-col gap-[4px] text-[12px] font-bold" style={{ color: 'var(--gj-grey)' }}>
            Du
            <input type="date" name="from" defaultValue={filtres.from.slice(0, 10)} className="rounded-[9px] border-[1.5px] px-[10px] py-[7px] text-[14px]" style={{ borderColor: 'var(--gj-line)' }} />
          </label>
          <label className="flex flex-col gap-[4px] text-[12px] font-bold" style={{ color: 'var(--gj-grey)' }}>
            Au
            <input type="date" name="to" defaultValue={filtres.to.slice(0, 10)} className="rounded-[9px] border-[1.5px] px-[10px] py-[7px] text-[14px]" style={{ borderColor: 'var(--gj-line)' }} />
          </label>
          <label className="flex flex-col gap-[4px] text-[12px] font-bold" style={{ color: 'var(--gj-grey)' }}>
            Centre
            <select name="centreId" defaultValue={filtres.centreIds[0] ?? ''} className="rounded-[9px] border-[1.5px] px-[10px] py-[7px] text-[14px] min-w-[160px]" style={{ borderColor: 'var(--gj-line)' }}>
              <option value="">Tous les centres</option>
              {centres.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex items-center gap-[6px] font-black text-[13px] rounded-[10px] px-[14px] py-[9px] min-h-[40px]" style={{ background: 'var(--gj-teal)', color: '#fff' }}>
            <Icon name="filter" size={14} /> Filtrer
          </button>
          <a href={`/api/admin/analytics/evenements/export?${exportQuery.toString()}`} className="inline-flex items-center gap-[6px] font-bold text-[13px] rounded-[10px] px-[14px] py-[9px] min-h-[40px]" style={{ background: 'var(--gj-surface)', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}>
            <Icon name="download" size={14} /> Exporter CSV
          </a>
        </form>

        {/* KPI */}
        <div className="grid gap-[12px] mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Tile icon="calendar" label="Événements" value={String(a.totalEvenements)} />
          <Tile icon="users" label="Inscriptions" value={String(a.totalInscriptions)} hint={`${a.participantsUniques} participants uniques`} />
          <Tile icon="check-circle" label="Taux de présence" value={pct(a.tauxPresence)} hint={`${a.presents}/${a.confirmes} confirmés`} />
          <Tile icon="chart" label="Taux de remplissage" value={pct(a.tauxRemplissage)} hint={`capacité ${a.capaciteTotale}`} />
        </div>

        <div className="grid gap-[12px] mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Bars title="Par type" items={a.parType} labels={TYPE_LABEL} />
          <Bars title="Par statut" items={a.parStatut} labels={STATUT_LABEL} />
          <Bars title="Inscriptions par statut" items={a.inscriptionsParStatut} labels={INSCR_LABEL} />
        </div>

        <div className="rounded-[14px] p-[16px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>Top centres (par événements)</h2>
          {a.topCentres.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucun événement sur la période.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {a.topCentres.map((c) => (
                <div key={c.centreNom} className="flex items-center justify-between text-[13px]">
                  <span className="font-bold" style={{ color: 'var(--gj-ink)' }}>{c.centreNom}</span>
                  <span style={{ color: 'var(--gj-grey)' }}>{c.evenements} événements · {c.inscriptions} inscriptions</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
