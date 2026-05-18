'use client'

import { useState, useEffect } from 'react'
import { Select } from '@/components/ui/Select'
import { Input }  from '@/components/ui/Input'
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

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1),
}))

const MONTHS = [
  { value: '01', label: 'Janvier'   }, { value: '02', label: 'Février'   },
  { value: '03', label: 'Mars'      }, { value: '04', label: 'Avril'     },
  { value: '05', label: 'Mai'       }, { value: '06', label: 'Juin'      },
  { value: '07', label: 'Juillet'   }, { value: '08', label: 'Août'      },
  { value: '09', label: 'Septembre' }, { value: '10', label: 'Octobre'   },
  { value: '11', label: 'Novembre'  }, { value: '12', label: 'Décembre'  },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => {
  const y = CURRENT_YEAR - 15 - i
  return { value: String(y), label: String(y) }
})

function splitDate(iso: string | null | undefined) {
  const parts = (iso ?? '').split('-')
  return {
    year:  parts[0] ?? '',
    month: parts[1] ?? '',
    day:   parts[2] ?? '',
  }
}

export function StepIdentite({ data, onChange, errors }: Props) {
  const initial = splitDate(data.dateNaissance)
  const [day,   setDay]   = useState(initial.day)
  const [month, setMonth] = useState(initial.month)
  const [year,  setYear]  = useState(initial.year)

  // Resync si dateNaissance change depuis l'extérieur (initialData pré-rempli)
  useEffect(() => {
    const s = splitDate(data.dateNaissance)
    setDay(s.day)
    setMonth(s.month)
    setYear(s.year)
  }, [data.dateNaissance])

  function handleDatePart(part: 'year' | 'month' | 'day', value: string) {
    const d = part === 'day'   ? value : day
    const m = part === 'month' ? value : month
    const y = part === 'year'  ? value : year
    if (part === 'day')   setDay(value)
    if (part === 'month') setMonth(value)
    if (part === 'year')  setYear(value)
    const assembled = y && m && d ? `${y}-${m}-${d}` : null
    onChange({ ...data, dateNaissance: assembled })
  }

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

      <fieldset>
        <legend className="text-fs-200 font-medium text-color-text-primary mb-space-2">
          Date de naissance
        </legend>
        <div className="grid grid-cols-3 gap-space-2">
          <Select
            id="dateNaissance_jour"
            label="Jour"
            options={DAYS}
            placeholder="Jour"
            value={day}
            onChange={e => handleDatePart('day', e.target.value)}
          />
          <Select
            id="dateNaissance_mois"
            label="Mois"
            options={MONTHS}
            placeholder="Mois"
            value={month}
            onChange={e => handleDatePart('month', e.target.value)}
          />
          <Select
            id="dateNaissance_annee"
            label="Année"
            options={YEARS}
            placeholder="Année"
            value={year}
            onChange={e => handleDatePart('year', e.target.value)}
          />
        </div>
        {errors.dateNaissance && (
          <p className="mt-space-1 text-fs-100 text-gj-red">{errors.dateNaissance}</p>
        )}
      </fieldset>

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
