import type { CSSProperties } from 'react'
import type { PageInfo } from '@/lib/centre-pagination'
import { CentrePager } from './CentrePager'
import { CentreSearch } from './CentreSearch'
import { CentreEvenementsList, type EvenementRow } from './CentreEvenementsList'

export type { EvenementRow }
export interface InsertionRow {
  id: string
  jeune: string
  detail: string
  date: string
}

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }


function H6({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>
      <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }} />
      {children}
    </div>
  )
}

function initials(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
}

/**
 * Onglet Événements & insertions de la fiche Centre (GUIC-687, fidèle cEvents) :
 * liste des événements du centre (date, titre, jauge d'inscriptions, statut) +
 * insertions professionnelles rattachées au centre (base du taux d'insertion national).
 */
export function CentreEvenements({ centreId, centreNom, evenements, insertions, tauxInsertion, evInfo, insInfo }: { centreId: string; centreNom: string; evenements: EvenementRow[]; insertions: InsertionRow[]; tauxInsertion: number; evInfo: PageInfo; insInfo: PageInfo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CentreEvenementsList centreId={centreId} centreNom={centreNom} evenements={evenements} info={evInfo} />

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}><H6>Insertion professionnelle · {tauxInsertion} %</H6></div>
          <div style={{ marginBottom: 12 }}><CentreSearch prefix="ins" placeholder="Rechercher un jeune…" label="Rechercher une insertion" /></div>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden', marginBottom: 14 }}>
          <span aria-hidden style={{ display: 'block', height: '100%', width: `${Math.min(100, tauxInsertion)}%`, borderRadius: 999, background: 'var(--gj-admin-gold)' }} />
        </div>
        {insertions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucune insertion{insInfo.total === 0 ? ' rattachée à ce centre' : ' pour cette recherche'}.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insertions.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}>{initials(p.jeune)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13, color: 'var(--gj-ink)', display: 'block' }}>{p.jeune}</b>
                  <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', display: 'block' }}>{p.detail}</span>
                </div>
                <time style={{ fontSize: 11, color: 'var(--gj-grey)', whiteSpace: 'nowrap' }}>{p.date}</time>
              </div>
            ))}
          </div>
        )}
        <CentrePager prefix="ins" info={insInfo} label="insertions" />
        <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 10, marginBottom: 0 }}>Insertions rattachées à ce centre — base du taux d&apos;insertion national.</p>
      </div>
    </div>
  )
}
