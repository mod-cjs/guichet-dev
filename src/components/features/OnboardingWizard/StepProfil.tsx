'use client'

import { Select } from '@/components/ui/Select'
import {
  NIVEAU_ETUDE_OPTIONS,
  SITUATION_EMPLOI_OPTIONS,
  DOMAINES_INTERET,
} from '@/lib/profil-constants'
import type { StepProfilData } from '@/lib/validations/onboarding'

interface Props {
  data:     Partial<StepProfilData>
  onChange: (data: Partial<StepProfilData>) => void
  errors:   Partial<Record<keyof StepProfilData, string>>
}

export function StepProfil({ data, onChange, errors }: Props) {
  const selected = data.domainesInteret ?? []

  function toggleDomaine(domaine: string) {
    const next = selected.includes(domaine)
      ? selected.filter(d => d !== domaine)
      : selected.length < 5
        ? [...selected, domaine]
        : selected
    onChange({ ...data, domainesInteret: next })
  }

  return (
    <div className="flex flex-col gap-space-5">
      <Select
        id="niveauEtude"
        label="Niveau d'étude"
        options={NIVEAU_ETUDE_OPTIONS as unknown as { value: string; label: string }[]}
        placeholder="Sélectionner…"
        value={data.niveauEtude ?? ''}
        error={errors.niveauEtude}
        onChange={e => onChange({ ...data, niveauEtude: e.target.value || null })}
      />

      <Select
        id="situationEmploi"
        label="Situation professionnelle"
        options={SITUATION_EMPLOI_OPTIONS as unknown as { value: string; label: string }[]}
        placeholder="Sélectionner…"
        value={data.situationEmploi ?? ''}
        error={errors.situationEmploi}
        onChange={e => onChange({ ...data, situationEmploi: e.target.value || null })}
      />

      <div className="flex flex-col gap-space-2">
        <p className="text-fs-300 font-bold text-color-text-primary">
          Domaines d&apos;intérêt{' '}
          <span className="font-normal text-color-text-secondary">(5 max)</span>
        </p>
        {errors.domainesInteret && (
          <p className="text-fs-200 text-gj-red">{errors.domainesInteret}</p>
        )}
        <div className="flex flex-wrap gap-space-2">
          {DOMAINES_INTERET.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDomaine(d)}
              className={`px-space-3 py-space-1 rounded-full text-fs-200 font-bold border-[1.5px]
                transition-colors duration-150 cursor-pointer
                ${selected.includes(d)
                  ? 'bg-gj-teal text-white border-gj-teal'
                  : 'bg-white text-gj-teal-deep border-gj-line hover:border-gj-teal'
                }
                ${!selected.includes(d) && selected.length >= 5 ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={!selected.includes(d) && selected.length >= 5}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
