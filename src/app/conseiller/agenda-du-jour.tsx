import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import type { AgendaItem } from '@/lib/loaders/conseiller'

/**
 * GUIC-497 — US-5 · Agenda du jour (timeline dérivée Réservation + Événement).
 * Rendu fidèle à `design-guichet-v4/agent-web.jsx` : heure + durée à gauche,
 * pastille (dorée pour un atelier collectif, teal pour un RDV) reliée par un
 * trait, puis intitulé + sous-titre.
 */
export function AgendaDuJour({ items, title = "Aujourd'hui", showMore = true }: { items: AgendaItem[]; title?: string; showMore?: boolean }) {
  return (
    <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center justify-between mb-space-3">
        <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 16 }}>{title}</h2>
        {showMore && (
          <Link href="/conseiller/agenda" className="no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 12.5 }}>
            Agenda →
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon="calendar" title="Rien de prévu" description="Les réservations et ateliers de ce jour s'afficheront ici." />
      ) : (
        <div className="flex flex-col">
          {items.map((it, i) => {
            const last = i === items.length - 1
            return (
              <div key={it.id} className="flex gap-space-3" style={{ paddingBottom: last ? 0 : 14 }}>
                <div className="shrink-0 text-right" style={{ width: 44 }}>
                  <div className="font-black text-color-text-primary" style={{ fontSize: 13 }}>{it.time}</div>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <span style={{ width: 9, height: 9, borderRadius: '50%', marginTop: 4, background: it.atelier ? 'var(--gj-yellow-deep, var(--gj-yellow))' : 'var(--gj-teal)' }} />
                  {!last && <span style={{ flex: 1, width: 2, background: 'var(--gj-line)', margin: '3px 0' }} />}
                </div>
                <div className="flex-1 min-w-0" style={{ paddingBottom: 2 }}>
                  <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13 }}>{it.label}</div>
                  <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>{it.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
