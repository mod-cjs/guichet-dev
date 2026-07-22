'use client'

/**
 * GUIC-647 — Recherche candidat dans la page + panneau de filtres avancés du kanban.
 * L'état vit dans l'URL (partageable, compatible RSC) ; « Appliquer » pousse les
 * query params, « Réinitialiser » ne conserve que le scope offre.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { REGIONS_SENEGAL } from '@/lib/loaders/recruteur'

const REGION_LABELS: Record<string, string> = {
  Thies: 'Thiès', Saint_Louis: 'Saint-Louis', Kedougou: 'Kédougou', Sedhiou: 'Sédhiou',
}

/** Clés de filtre portées par l'URL (hors scope `offre`). */
const FILTRE_KEYS = ['q', 'region', 'commune', 'genre', 'ageMin', 'ageMax', 'niveau', 'situation', 'competence', 'scoreMin', 'favoris', 'depuis'] as const
type FiltreKey = (typeof FILTRE_KEYS)[number]
type FiltreState = Partial<Record<FiltreKey, string>>

const field = 'rounded-[10px] border-[1.5px] px-[10px] min-h-[40px] text-[13px] bg-white w-full'
const fieldStyle = { borderColor: 'var(--gj-line)', color: 'var(--gj-ink)' } as const

export function FiltresPanneau({ sp }: { sp: Record<string, string | undefined> }) {
  const router = useRouter()
  const initial: FiltreState = {}
  for (const k of FILTRE_KEYS) if (sp[k]) initial[k] = sp[k]
  const [f, setF] = useState<FiltreState>(initial)
  const [ouvert, setOuvert] = useState(false)

  const actifs = FILTRE_KEYS.filter((k) => k !== 'q' && sp[k]).length
  const set = (k: FiltreKey, v: string) => setF((prev) => ({ ...prev, [k]: v }))

  function appliquer(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (sp.offre) params.set('offre', sp.offre)
    for (const k of FILTRE_KEYS) {
      const v = f[k]?.trim()
      if (v) params.set(k, v)
    }
    router.push(`/recruteur/candidatures${params.toString() ? `?${params}` : ''}`)
  }

  function reinitialiser() {
    setF({})
    router.push(sp.offre ? `/recruteur/candidatures?offre=${sp.offre}` : '/recruteur/candidatures')
  }

  return (
    <form onSubmit={appliquer} className="rounded-[14px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      {/* Barre : recherche + bascule filtres */}
      <div className="flex items-center gap-2 p-[10px] flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-[10px] border-[1.5px] px-[10px] min-h-[44px] bg-white" style={{ borderColor: 'var(--gj-line)' }}>
          <Icon name="search" size={15} style={{ color: 'var(--gj-grey)' }} />
          <input
            type="search"
            value={f.q ?? ''}
            onChange={(e) => set('q', e.target.value)}
            placeholder="Rechercher un candidat (prénom, nom)…"
            aria-label="Rechercher un candidat"
            className="flex-1 border-0 outline-none text-[13px] bg-transparent"
            style={{ color: 'var(--gj-ink)' }}
          />
        </div>
        <button type="submit" className="inline-flex items-center gap-[6px] font-black text-[13px] rounded-[10px] px-[16px] min-h-[44px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', border: 0, cursor: 'pointer' }}>
          Rechercher
        </button>
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          className="inline-flex items-center gap-[6px] font-bold text-[13px] rounded-[10px] px-[14px] min-h-[44px]"
          style={{ background: '#fff', color: 'var(--gj-blue-ink, #1A3FA8)', border: '1.5px solid var(--gj-blue, #1A4ED8)', cursor: 'pointer' }}
        >
          <Icon name="filter" size={14} />
          Filtres{actifs > 0 ? ` (${actifs})` : ''}
          <Icon name="chevron-down" size={13} style={{ transform: ouvert ? 'rotate(180deg)' : undefined }} />
        </button>
      </div>

      {/* Panneau de filtres avancés */}
      {ouvert && (
        <div className="p-[12px] pt-0">
          <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Région
              <select value={f.region ?? ''} onChange={(e) => set('region', e.target.value)} className={field} style={fieldStyle}>
                <option value="">Toutes</option>
                {REGIONS_SENEGAL.map((r) => <option key={r} value={r}>{REGION_LABELS[r] ?? r}</option>)}
              </select>
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Commune
              <input type="text" value={f.commune ?? ''} onChange={(e) => set('commune', e.target.value)} placeholder="Ex. Pikine" className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Genre
              <select value={f.genre ?? ''} onChange={(e) => set('genre', e.target.value)} className={field} style={fieldStyle}>
                <option value="">Tous</option>
                <option value="F">Femme</option>
                <option value="M">Homme</option>
              </select>
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Âge min
              <input type="number" min={15} max={45} value={f.ageMin ?? ''} onChange={(e) => set('ageMin', e.target.value)} className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Âge max
              <input type="number" min={15} max={45} value={f.ageMax ?? ''} onChange={(e) => set('ageMax', e.target.value)} className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Niveau d&apos;étude
              <input type="text" value={f.niveau ?? ''} onChange={(e) => set('niveau', e.target.value)} placeholder="Ex. Licence" className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Situation d&apos;emploi
              <input type="text" value={f.situation ?? ''} onChange={(e) => set('situation', e.target.value)} placeholder="Ex. En recherche" className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Compétence
              <input type="text" value={f.competence ?? ''} onChange={(e) => set('competence', e.target.value)} placeholder="Ex. Python" className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Score IA min (%)
              <input type="number" min={0} max={100} step={5} value={f.scoreMin ?? ''} onChange={(e) => set('scoreMin', e.target.value)} className={field} style={fieldStyle} />
            </label>
            <label className="text-[11.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>
              Soumise depuis
              <select value={f.depuis ?? ''} onChange={(e) => set('depuis', e.target.value)} className={field} style={fieldStyle}>
                <option value="">Toujours</option>
                <option value="7">7 jours</option>
                <option value="30">30 jours</option>
                <option value="90">90 jours</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-[8px] text-[12.5px] font-bold self-end min-h-[40px]" style={{ color: 'var(--gj-ink)', cursor: 'pointer' }}>
              <input type="checkbox" checked={f.favoris === '1'} onChange={(e) => set('favoris', e.target.checked ? '1' : '')} style={{ width: 16, height: 16 }} />
              Favoris uniquement
            </label>
          </div>
          <div className="flex items-center gap-2 mt-[12px]">
            <button type="submit" className="inline-flex items-center gap-[6px] font-black text-[13px] rounded-[10px] px-[16px] min-h-[40px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', border: 0, cursor: 'pointer' }}>
              <Icon name="check" size={14} /> Appliquer
            </button>
            <button type="button" onClick={reinitialiser} className="inline-flex items-center gap-[6px] font-bold text-[13px] rounded-[10px] px-[14px] min-h-[40px]" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', cursor: 'pointer' }}>
              <Icon name="close" size={13} /> Réinitialiser
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
