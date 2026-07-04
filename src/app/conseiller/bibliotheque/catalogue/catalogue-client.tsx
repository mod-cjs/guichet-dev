'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { BookCard } from '../book-card'
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
        <div className="grid gap-space-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {filtered.map((l) => {
            const emp = l.emplacements[0]
            return (
              <BookCard
                key={l.id}
                b={{
                  titre: l.titre,
                  auteur: l.auteur,
                  theme: l.theme,
                  couvertureUrl: l.couvertureUrl,
                  exemplairesDisponibles: l.exemplairesDisponibles,
                  exemplairesTotal: l.exemplairesTotal,
                  emplacement: emp ? `${emp.rayon} · ${emp.etagere} · ${emp.position}` : null,
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
