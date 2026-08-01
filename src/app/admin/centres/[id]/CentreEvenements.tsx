import type { CSSProperties } from 'react'

export interface EvenementRow {
  id: string
  jour: string
  mois: string
  titre: string
  inscrits: number
  capacite: number | null
  statut: string
}
export interface InsertionRow {
  id: string
  jeune: string
  detail: string
  date: string
}

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }

const STATUT_EV: Record<string, { label: string; bg: string; fg: string }> = {
  a_venir: { label: 'À venir', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  en_cours: { label: 'En cours', bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' },
  termine: { label: 'Terminé', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
  annule: { label: 'Annulé', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  en_relecture: { label: 'En relecture', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  refuse: { label: 'Refusé', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
}

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
export function CentreEvenements({ evenements, insertions, tauxInsertion }: { evenements: EvenementRow[]; insertions: InsertionRow[]; tauxInsertion: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <H6>Événements du centre</H6>
        {evenements.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun événement pour ce centre.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evenements.map((e) => {
              const v = STATUT_EV[e.statut] ?? STATUT_EV.termine
              const pct = e.capacite && e.capacite > 0 ? Math.min(100, Math.round((e.inscrits / e.capacite) * 100)) : 0
              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 15, alignItems: 'center', background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ width: 52, textAlign: 'center', borderRight: '1px solid var(--gj-line)', paddingRight: 15 }}>
                    <b style={{ fontSize: 21, fontWeight: 900, display: 'block', lineHeight: 1, color: 'var(--gj-ink)' }}>{e.jour}</b>
                    <span style={{ fontSize: 11, color: 'var(--gj-grey)', fontWeight: 700 }}>{e.mois}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)', display: 'block' }}>{e.titre}</b>
                    <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 3 }}>{e.inscrits}{e.capacite ? ` / ${e.capacite}` : ''} inscrits</div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden', maxWidth: 200, marginTop: 6 }}>
                      <span aria-hidden style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--gj-admin-gold)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: v.bg, color: v.fg }}>{v.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={card}>
        <H6>Insertion professionnelle · {tauxInsertion} %</H6>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden', marginBottom: 14 }}>
          <span aria-hidden style={{ display: 'block', height: '100%', width: `${Math.min(100, tauxInsertion)}%`, borderRadius: 999, background: 'var(--gj-admin-gold)' }} />
        </div>
        {insertions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucune insertion rattachée à ce centre.</p>
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
        <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 10, marginBottom: 0 }}>Insertions rattachées à ce centre — base du taux d&apos;insertion national.</p>
      </div>
    </div>
  )
}
