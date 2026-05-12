'use client'

import { Input }  from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { StepIdentiteData } from '@/lib/validations/onboarding'

interface Props {
  data:     Partial<StepIdentiteData>
  onChange: (data: Partial<StepIdentiteData>) => void
  errors:   Partial<Record<keyof StepIdentiteData, string>>
}

const GENRE_OPTIONS = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
]

export function StepIdentite({ data, onChange, errors }: Props) {
  return (
    <div className="flex flex-col gap-space-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-4">
        <Input
          id="nom"
          label="Nom de famille"
          required
          value={data.nom ?? ''}
          error={errors.nom}
          onChange={e => onChange({ ...data, nom: e.target.value })}
        />
        <Input
          id="prenom"
          label="Prénom"
          required
          value={data.prenom ?? ''}
          error={errors.prenom}
          onChange={e => onChange({ ...data, prenom: e.target.value })}
        />
      </div>

      <Input
        id="dateNaissance"
        label="Date de naissance"
        type="date"
        value={data.dateNaissance ?? ''}
        error={errors.dateNaissance}
        onChange={e => onChange({ ...data, dateNaissance: e.target.value || null })}
      />

      <Select
        id="genre"
        label="Genre"
        options={GENRE_OPTIONS}
        placeholder="Non précisé"
        value={data.genre ?? ''}
        error={errors.genre}
        onChange={e => onChange({ ...data, genre: (e.target.value || null) as 'M' | 'F' | null })}
      />
    </div>
  )
}
