'use client'

import { Input }  from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { StepLocalisationData } from '@/lib/validations/onboarding'

interface Props {
  data:     Partial<StepLocalisationData>
  onChange: (data: Partial<StepLocalisationData>) => void
  errors:   Partial<Record<keyof StepLocalisationData, string>>
}

const REGION_OPTIONS = [
  { value: 'Dakar',        label: 'Dakar'         },
  { value: 'Thies',        label: 'Thiès'         },
  { value: 'Diourbel',     label: 'Diourbel'      },
  { value: 'Fatick',       label: 'Fatick'        },
  { value: 'Kaolack',      label: 'Kaolack'       },
  { value: 'Kaffrine',     label: 'Kaffrine'      },
  { value: 'Louga',        label: 'Louga'         },
  { value: 'Saint_Louis',  label: 'Saint-Louis'   },
  { value: 'Matam',        label: 'Matam'         },
  { value: 'Tambacounda',  label: 'Tambacounda'   },
  { value: 'Kedougou',     label: 'Kédougou'      },
  { value: 'Kolda',        label: 'Kolda'         },
  { value: 'Ziguinchor',   label: 'Ziguinchor'    },
  { value: 'Sedhiou',      label: 'Sédhiou'       },
]

export function StepLocalisation({ data, onChange, errors }: Props) {
  return (
    <div className="flex flex-col gap-space-4">
      <Select
        id="region"
        label="Région"
        required
        options={REGION_OPTIONS}
        placeholder="Sélectionner votre région"
        value={data.region ?? ''}
        error={errors.region}
        onChange={e => onChange({ ...data, region: e.target.value })}
      />

      <Input
        id="commune"
        label="Commune / Arrondissement"
        placeholder="Ex : Pikine, Parcelles Assainies…"
        value={data.commune ?? ''}
        error={errors.commune}
        onChange={e => onChange({ ...data, commune: e.target.value || null })}
      />
    </div>
  )
}
