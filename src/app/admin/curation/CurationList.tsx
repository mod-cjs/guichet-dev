'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'

/** GUIC-600 — US-5 : liste de la file de curation (onglets + filtres). */

export interface CurationRow {
  id: string
  titre: string
  sourceNom: string
  organisation: string
  typeLabel: string
  score: number
  dateLabel: string
  opportuniteId?: string | null
}

interface CurationListProps {
  rows: CurationRow[]
  total: number
  page: number
  totalPages: number
  onglet: 'a_valider' | 'en_attente' | 'approuvee' | 'rejetee'
  sources: Array<{ id: string; nom: string }>
  types: Array<{ id: string; libelle: string }>
  filtres: { source: string; type: string; scoreMin: string }
}

const GRID = '1.8fr 1fr 1fr 0.9fr 0.6fr 0.7fr'

export function CurationList({
  rows,
  total,
  page,
  totalPages,
  onglet,
  sources,
  types,
  filtres,
}: CurationListProps) {
  const router = useRouter()

  function naviguer(patch: Record<string, string>) {
    const params = new URLSearchParams()
    params.set('onglet', onglet)
    if (filtres.source) params.set('source', filtres.source)
    if (filtres.type) params.set('type', filtres.type)
    if (filtres.scoreMin) params.set('scoreMin', filtres.scoreMin)
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    params.delete('page')
    router.push(`/admin/curation?${params.toString()}`)
  }

  function ongletHref(o: string) {
    const params = new URLSearchParams()
    params.set('onglet', o)
    return `/admin/curation?${params.toString()}`
  }

  return (
    <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: '0 0 4px' }}>
          File de curation
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 0, marginBottom: 16 }}>
          {total.toLocaleString('fr-FR')} opportunité(s) — rien n’est publié sans validation.
        </p>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--gj-border)' }}>
          {(
            [
              ['a_valider', 'À valider'],
              ['en_attente', 'En attente'],
              ['approuvee', 'Approuvées'],
              ['rejetee', 'Rejetées'],
            ] as const
          ).map(([val, label]) => (
            <Link
              key={val}
              href={ongletHref(val)}
              style={{
                padding: '8px 14px',
                fontSize: 13.5,
                fontWeight: 800,
                textDecoration: 'none',
                color: onglet === val ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
                borderBottom: onglet === val ? '2px solid var(--gj-teal-deep)' : '2px solid transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <Select
            id="filtre-source"
            label="Source"
            options={[{ value: '', label: 'Toutes' }, ...sources.map((s) => ({ value: s.id, label: s.nom }))]}
            value={filtres.source}
            onChange={(e) => naviguer({ source: e.target.value })}
          />
          <Select
            id="filtre-type"
            label="Type"
            options={[{ value: '', label: 'Tous' }, ...types.map((t) => ({ value: t.id, label: t.libelle }))]}
            value={filtres.type}
            onChange={(e) => naviguer({ type: e.target.value })}
          />
          <Select
            id="filtre-score"
            label="Score min."
            options={[
              { value: '', label: 'Aucun' },
              { value: '25', label: '≥ 25%' },
              { value: '50', label: '≥ 50%' },
              { value: '75', label: '≥ 75%' },
            ]}
            value={filtres.scoreMin}
            onChange={(e) => naviguer({ scoreMin: e.target.value })}
          />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--gj-surface)', borderRadius: 14, border: '1px solid var(--gj-border)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 10,
              padding: '10px 16px',
              fontSize: 11.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'var(--gj-grey)',
              borderBottom: '1px solid var(--gj-border)',
            }}
          >
            <span>Opportunité</span>
            <span>Source</span>
            <span>Organisation</span>
            <span>Type</span>
            <span>Score</span>
            <span style={{ textAlign: 'right' }}>Détecté</span>
          </div>

          {rows.length === 0 && (
            <p style={{ padding: '28px 16px', fontSize: 13.5, color: 'var(--gj-grey)', margin: 0 }}>
              Aucune opportunité dans cet onglet.
            </p>
          )}

          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/curation/${r.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 10,
                padding: '12px 16px',
                alignItems: 'center',
                borderBottom: '1px solid var(--gj-border)',
                fontSize: 13.5,
                textDecoration: 'none',
                color: 'inherit',
                minHeight: 'var(--tap-min)',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--gj-ink)' }}>
                {r.titre}
                {onglet === 'approuvee' && r.opportuniteId && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--gj-teal-deep)',
                      border: '1px solid var(--gj-teal-deep)',
                      borderRadius: 6,
                      padding: '1px 6px',
                    }}
                  >
                    Publiée
                  </span>
                )}
              </span>
              <span style={{ color: 'var(--gj-grey)' }}>{r.sourceNom}</span>
              <span>{r.organisation}</span>
              <span>{r.typeLabel}</span>
              <span style={{ fontWeight: 800, color: r.score >= 50 ? 'var(--gj-teal-deep)' : 'var(--gj-grey)' }}>
                {r.score}%
              </span>
              <span style={{ textAlign: 'right', color: 'var(--gj-grey)', fontSize: 12.5 }}>{r.dateLabel}</span>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ marginTop: 16 }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              baseUrl={`/admin/curation?onglet=${onglet}`}
              ariaLabel="Pagination de la file de curation"
            />
          </div>
        )}
      </div>
    </div>
  )
}
