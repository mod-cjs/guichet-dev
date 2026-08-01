import type { CSSProperties } from 'react'
import type { PageInfo } from '@/lib/centre-pagination'
import { CentreSearch } from './CentreSearch'
import { CentrePager } from './CentrePager'

export interface BiblioEmpruntRow {
  id: string
  titre: string
  auteur: string
  emprunteur: string
  emprunteLe: string
  retourPrevu: string | null
  statut: string
  enRetard: boolean
}
export interface BiblioKpis { exemplaires: number; enCours: number; enRetard: number; titres: number }

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 12, boxShadow: 'var(--gj-edge)', padding: '13px 15px' }
const td: CSSProperties = { padding: 12, borderBottom: '1px solid var(--gj-line)', verticalAlign: 'top' }

const STATUT_VIEW: Record<string, { label: string; bg: string; fg: string }> = {
  en_cours: { label: 'En cours', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  en_retard: { label: 'En retard', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  initie: { label: 'À confirmer', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
}

function H6({ children }: { children: React.ReactNode }) {
  return (
    <h6 style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flexShrink: 0 }} />
      {children}
    </h6>
  )
}

/**
 * Onglet Bibliothèque de la fiche Centre (GUIC-687, fidèle cBiblio) : 4 tuiles KPI
 * (exemplaires, emprunts en cours, en retard, titres) + table des emprunts en cours
 * (recherche titre/jeune). Exemplaires physiques localisés dans ce centre (GUIC-274).
 */
export function CentreBibliotheque({ kpis, emprunts, info }: { kpis: BiblioKpis; emprunts: BiblioEmpruntRow[]; info: PageInfo }) {
  const view = emprunts

  const tiles = [
    { label: 'Exemplaires', value: kpis.exemplaires },
    { label: 'Emprunts en cours', value: kpis.enCours },
    { label: 'En retard', value: kpis.enRetard },
    { label: 'Titres au catalogue', value: kpis.titres },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {tiles.map((t) => (
          <div key={t.label} style={card}>
            <b style={{ fontSize: 21, fontWeight: 900, color: 'var(--gj-ink)', display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{t.value.toLocaleString('fr-FR')}</b>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gj-grey)', display: 'block', marginTop: 6 }}>{t.label}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <H6>Emprunts en cours</H6>
          <CentreSearch prefix="emp" placeholder="Rechercher un titre, un jeune…" label="Rechercher un emprunt" />
        </div>

        {view.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun emprunt en cours{info.total === 0 ? '' : ' pour cette recherche'}.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: 13 }}>
              <thead>
                <tr>
                  {['Titre', 'Emprunteur', 'Emprunté le', 'Retour prévu', 'Statut'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey)', padding: '0 12px 10px', borderBottom: '1px solid var(--gj-line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.map((e) => {
                  const v = STATUT_VIEW[e.statut] ?? { label: e.statut, bg: 'var(--gj-line)', fg: 'var(--gj-grey)' }
                  return (
                    <tr key={e.id}>
                      <td style={{ ...td, color: 'var(--gj-ink)' }}>
                        <b style={{ fontWeight: 700 }}>{e.titre}</b>
                        <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 2 }}>{e.auteur}</div>
                      </td>
                      <td style={{ ...td, color: 'var(--gj-grey)' }}>{e.emprunteur}</td>
                      <td style={{ ...td, color: 'var(--gj-grey)', whiteSpace: 'nowrap' }}>{e.emprunteLe}</td>
                      <td style={{ ...td, color: e.enRetard ? 'var(--gj-red-ink)' : 'var(--gj-grey)', whiteSpace: 'nowrap', fontWeight: e.enRetard ? 700 : 400 }}>{e.retourPrevu ?? '—'}</td>
                      <td style={td}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: v.bg, color: v.fg }}>{v.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <CentrePager prefix="emp" info={info} label="emprunts" />
        <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 10, marginBottom: 0 }}>Comptoir · exemplaires physiques localisés dans ce centre.</p>
      </div>
    </div>
  )
}
