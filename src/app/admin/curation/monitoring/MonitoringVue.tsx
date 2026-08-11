import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { ResumeCuration } from '@/lib/curation/monitoring/stats'

/** GUIC-704 · Lot 3 — Monitoring de la veille (refonte registre : synthèse + santé + alertes actionnables). */

export interface LigneMonitoring {
  sourceId: string
  nom: string
  actif: boolean
  nbRapportees: number
  tauxApprobation: number | null
  tauxRejet: number | null
  nbErreursRecentes: number
  derniereVerif: string
  alerte: 'erreur_repetee' | 'chute_zero' | null
}

type Sante = { label: string; bg: string; fg: string; alerte: boolean }

/** Santé dérivée : alerte (rouge) > erreurs récentes (jaune, « Instable ») > OK (vert). */
function sante(l: LigneMonitoring): Sante {
  if (l.alerte === 'erreur_repetee') return { label: 'Erreurs répétées', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)', alerte: true }
  if (l.alerte === 'chute_zero') return { label: 'Chute à zéro', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)', alerte: true }
  if (l.nbErreursRecentes > 0) return { label: 'Instable', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)', alerte: false }
  return { label: 'OK', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)', alerte: false }
}

const GRID = '1.7fr 0.8fr 0.9fr 0.8fr 1fr 0.7fr'

function StatTuile({ valeur, label, ton }: { valeur: number; label: string; ton?: 'alerte' }) {
  return (
    <div className="rounded-[12px] px-[16px] py-[12px] flex-1 min-w-[120px]" style={{ background: 'var(--gj-surface)', border: `1.5px solid ${ton === 'alerte' && valeur > 0 ? 'var(--gj-red)' : 'var(--gj-line)'}` }}>
      <div className="text-[22px] font-black leading-none" style={{ color: ton === 'alerte' && valeur > 0 ? 'var(--gj-red-ink)' : 'var(--gj-ink)' }}>
        {valeur.toLocaleString('fr-FR')}
      </div>
      <div className="text-[11.5px] font-bold mt-[4px] uppercase tracking-wide" style={{ color: 'var(--gj-grey)' }}>{label}</div>
    </div>
  )
}

const cell: CSSProperties = { display: 'grid', gridTemplateColumns: GRID, gap: 10, alignItems: 'center' }

export function MonitoringVue({ resume, lignes }: { resume: ResumeCuration; lignes: LigneMonitoring[] }) {
  const enAlerte = lignes.filter((l) => sante(l).alerte)

  return (
    <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Monitoring de la veille</h1>
        <p className="text-[13px] mt-[3px] mb-[16px]" style={{ color: 'var(--gj-grey)' }}>
          Santé des sources de curation — approbation, erreurs, chute de production.
        </p>

        {/* Synthèse */}
        <div className="flex gap-[10px] flex-wrap mb-[16px]">
          <StatTuile valeur={resume.nbSources} label="Sources" />
          <StatTuile valeur={resume.nbEnAlerte} label="En alerte" ton="alerte" />
          <StatTuile valeur={resume.parStatut.a_valider ?? 0} label="À valider" />
          <StatTuile valeur={resume.parStatut.approuvee ?? 0} label="Approuvées" />
        </div>

        {/* Bandeau alertes actionnable */}
        {enAlerte.length > 0 && (
          <div role="alert" className="rounded-[12px] px-[14px] py-[12px] mb-[16px]" style={{ background: 'var(--gj-red-soft)', border: '1.5px solid var(--gj-red)' }}>
            <div className="flex items-center gap-[6px] font-black text-[13px] mb-[8px]" style={{ color: 'var(--gj-red-ink)' }}>
              <Icon name="alert" size={15} /> {enAlerte.length} source{enAlerte.length > 1 ? 's' : ''} à revoir
            </div>
            <ul className="flex flex-col gap-[4px]">
              {enAlerte.map((l) => (
                <li key={l.sourceId} className="text-[12.5px] flex items-center gap-[8px] flex-wrap" style={{ color: 'var(--gj-ink)' }}>
                  <b>{l.nom}</b>
                  <span style={{ color: 'var(--gj-red-ink)' }}>— {sante(l).label}</span>
                  <Link href="/admin/sources-veille" className="font-bold inline-flex items-center gap-[2px]" style={{ color: 'var(--gj-teal-deep)' }}>
                    Voir la source <Icon name="chevron-right" size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Registre par source */}
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <div style={{ ...cell, padding: '10px 16px', borderBottom: '1.5px solid var(--gj-line)' }} className="text-[11px] font-black uppercase tracking-wide" >
            <span style={{ color: 'var(--gj-grey)' }}>Source</span>
            <span style={{ color: 'var(--gj-grey)' }}>Rapportées</span>
            <span style={{ color: 'var(--gj-grey)' }}>Approbation</span>
            <span style={{ color: 'var(--gj-grey)' }}>Erreurs</span>
            <span style={{ color: 'var(--gj-grey)' }}>Dernière collecte</span>
            <span style={{ color: 'var(--gj-grey)', textAlign: 'right' }}>Santé</span>
          </div>

          {lignes.length === 0 ? (
            <p className="text-[13.5px] m-0" style={{ padding: '28px 16px', color: 'var(--gj-grey)' }}>Aucune source configurée.</p>
          ) : (
            lignes.map((l) => {
              const s = sante(l)
              return (
                <div key={l.sourceId} style={{ ...cell, padding: '12px 16px', borderBottom: '1.5px solid var(--gj-line)' }} className="text-[13.5px]">
                  <span className="font-bold flex items-center gap-[8px]" style={{ color: 'var(--gj-ink)' }}>
                    {l.nom}
                    {!l.actif && <span className="text-[10px] font-black px-[7px] py-[1px] rounded-full uppercase" style={{ background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>Inactive</span>}
                  </span>
                  <span>{l.nbRapportees}</span>
                  <span className="font-bold" style={{ color: 'var(--gj-teal-deep)' }}>{l.tauxApprobation === null ? '—' : `${l.tauxApprobation}%`}</span>
                  <span style={{ color: l.nbErreursRecentes > 0 ? 'var(--gj-red-ink)' : 'var(--gj-grey)' }}>{l.nbErreursRecentes}</span>
                  <span className="text-[12.5px]" style={{ color: 'var(--gj-grey)' }}>{l.derniereVerif}</span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="inline-block text-[10.5px] font-black px-[8px] py-[2px] rounded-full uppercase" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                  </span>
                </div>
              )
            })
          )}
        </div>

        <p className="text-[12.5px] mt-[14px]" style={{ color: 'var(--gj-grey)' }}>
          <Link href="/admin/sources-veille" style={{ color: 'var(--gj-teal-deep)' }}>Gérer les sources</Link>
          {' · '}
          <Link href="/admin/curation" style={{ color: 'var(--gj-teal-deep)' }}>File de curation</Link>
        </p>
      </div>
    </div>
  )
}
