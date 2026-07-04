'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import type { LivreVue } from '@/lib/bibliotheque/service'

export function CatalogueClient({ livres }: { livres: LivreVue[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return livres
    return livres.filter((l) => `${l.titre} ${l.auteur} ${l.theme}`.toLowerCase().includes(t))
  }, [q, livres])

  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex items-center gap-space-2" style={{ background: '#fff', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 44, maxWidth: 420 }}>
        <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un livre (titre, auteur, thème)…" aria-label="Rechercher un livre" className="flex-1 bg-transparent outline-none text-fs-300" style={{ border: 0, color: 'var(--gj-ink)' }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="learning" title="Aucun livre" description={q ? `Aucun résultat pour « ${q} ».` : 'Le catalogue de ce centre est vide.'} />
      ) : (
        <div className="grid gap-space-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {filtered.map((l) => {
            const dispo = l.exemplairesDisponibles > 0
            const emp = l.emplacements[0]
            return (
              <div key={l.id} className="bg-white rounded-gj-lg p-space-4 flex flex-col gap-space-2" style={{ border: '1px solid var(--gj-line)' }}>
                <div className="flex items-start gap-space-2">
                  <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 40, height: 40, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}><Icon name="learning" size={20} /></span>
                  <span className="font-extrabold uppercase ml-auto" style={{ fontSize: 9.5, letterSpacing: '.3px', color: dispo ? 'var(--gj-green-ink)' : 'var(--gj-grey)', background: dispo ? 'var(--gj-green-soft)' : 'var(--gj-bg)', padding: '3px 8px', borderRadius: 999 }}>
                    {l.exemplairesDisponibles}/{l.exemplairesTotal} dispo
                  </span>
                </div>
                <div className="font-extrabold text-color-text-primary" style={{ fontSize: 14, lineHeight: 1.25 }}>{l.titre}</div>
                <div className="text-color-text-secondary" style={{ fontSize: 11.5 }}>{l.auteur} · {l.theme}</div>
                {emp && <div className="text-color-text-secondary" style={{ fontSize: 11 }}>Emplacement : {emp.rayon} · {emp.etagere} · {emp.position}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
