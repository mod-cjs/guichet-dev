'use client'

import { Select } from '@/components/ui/Select'
import type { StepLocalisationData } from '@/lib/validations/onboarding'

interface Props {
  data:     Partial<StepLocalisationData>
  onChange: (data: Partial<StepLocalisationData>) => void
  errors:   Partial<Record<keyof StepLocalisationData, string>>
}

const REGION_OPTIONS = [
  { value: 'Dakar',        label: 'Dakar'        },
  { value: 'Thies',        label: 'Thiès'        },
  { value: 'Diourbel',     label: 'Diourbel'     },
  { value: 'Fatick',       label: 'Fatick'       },
  { value: 'Kaolack',      label: 'Kaolack'      },
  { value: 'Kaffrine',     label: 'Kaffrine'     },
  { value: 'Louga',        label: 'Louga'        },
  { value: 'Saint_Louis',  label: 'Saint-Louis'  },
  { value: 'Matam',        label: 'Matam'        },
  { value: 'Tambacounda',  label: 'Tambacounda'  },
  { value: 'Kedougou',     label: 'Kédougou'     },
  { value: 'Kolda',        label: 'Kolda'        },
  { value: 'Ziguinchor',   label: 'Ziguinchor'   },
  { value: 'Sedhiou',      label: 'Sédhiou'      },
]

const COMMUNES: Record<string, { value: string; label: string }[]> = {
  Dakar: [
    { value: 'Dakar-Plateau',          label: 'Dakar Plateau'          },
    { value: 'Médina',                 label: 'Médina'                 },
    { value: 'Pikine',                 label: 'Pikine'                 },
    { value: 'Guédiawaye',             label: 'Guédiawaye'             },
    { value: 'Parcelles Assainies',    label: 'Parcelles Assainies'    },
    { value: 'Yeumbeul',               label: 'Yeumbeul'               },
    { value: 'Keur Massar',            label: 'Keur Massar'            },
    { value: 'Rufisque',               label: 'Rufisque'               },
    { value: 'Bargny',                 label: 'Bargny'                 },
    { value: 'Diamniadio',             label: 'Diamniadio'             },
    { value: 'Sébikotane',             label: 'Sébikotane'             },
    { value: 'Sangalkam',              label: 'Sangalkam'              },
  ],
  Thies: [
    { value: 'Thiès',          label: 'Thiès'          },
    { value: 'Mbour',          label: 'Mbour'          },
    { value: 'Tivaouane',      label: 'Tivaouane'      },
    { value: 'Joal-Fadiouth',  label: 'Joal-Fadiouth'  },
    { value: 'Saly',           label: 'Saly'           },
    { value: 'Khombole',       label: 'Khombole'       },
    { value: 'Pout',           label: 'Pout'           },
    { value: 'Meckhe',         label: 'Mékhé'          },
  ],
  Diourbel: [
    { value: 'Diourbel',  label: 'Diourbel'  },
    { value: 'Touba',     label: 'Touba'     },
    { value: 'Mbacké',    label: 'Mbacké'    },
    { value: 'Bambey',    label: 'Bambey'    },
  ],
  Fatick: [
    { value: 'Fatick',      label: 'Fatick'      },
    { value: 'Foundiougne', label: 'Foundiougne' },
    { value: 'Gossas',      label: 'Gossas'      },
    { value: 'Sokone',      label: 'Sokone'      },
  ],
  Kaolack: [
    { value: 'Kaolack',   label: 'Kaolack'   },
    { value: 'Nioro',     label: 'Nioro'     },
    { value: 'Guinguinéo', label: 'Guinguinéo' },
  ],
  Kaffrine: [
    { value: 'Kaffrine',   label: 'Kaffrine'   },
    { value: 'Birkelane',  label: 'Birkelane'  },
    { value: 'Koungheul',  label: 'Koungheul'  },
    { value: 'Malem-Hodar', label: 'Malem-Hodar' },
  ],
  Louga: [
    { value: 'Louga',      label: 'Louga'      },
    { value: 'Kébémer',    label: 'Kébémer'    },
    { value: 'Linguère',   label: 'Linguère'   },
    { value: 'Coki',       label: 'Coki'       },
  ],
  Saint_Louis: [
    { value: 'Saint-Louis', label: 'Saint-Louis' },
    { value: 'Dagana',      label: 'Dagana'      },
    { value: 'Podor',       label: 'Podor'       },
    { value: 'Richard-Toll', label: 'Richard-Toll' },
    { value: 'Rosso',       label: 'Rosso'       },
  ],
  Matam: [
    { value: 'Matam',       label: 'Matam'       },
    { value: 'Kanel',       label: 'Kanel'       },
    { value: 'Ranérou',     label: 'Ranérou'     },
    { value: 'Ourossogui',  label: 'Ourossogui'  },
  ],
  Tambacounda: [
    { value: 'Tambacounda', label: 'Tambacounda' },
    { value: 'Bakel',       label: 'Bakel'       },
    { value: 'Goudiry',     label: 'Goudiry'     },
    { value: 'Koumpentoum', label: 'Koumpentoum' },
  ],
  Kedougou: [
    { value: 'Kédougou',    label: 'Kédougou'    },
    { value: 'Saraya',      label: 'Saraya'      },
    { value: 'Salemata',    label: 'Salemata'    },
  ],
  Kolda: [
    { value: 'Kolda',       label: 'Kolda'       },
    { value: 'Médina Yoro Foulah', label: 'Médina Yoro Foulah' },
    { value: 'Vélingara',   label: 'Vélingara'   },
  ],
  Ziguinchor: [
    { value: 'Ziguinchor',  label: 'Ziguinchor'  },
    { value: 'Bignona',     label: 'Bignona'     },
    { value: 'Oussouye',    label: 'Oussouye'    },
  ],
  Sedhiou: [
    { value: 'Sédhiou',     label: 'Sédhiou'     },
    { value: 'Bounkiling',  label: 'Bounkiling'  },
    { value: 'Goudomp',     label: 'Goudomp'     },
  ],
}

export function StepLocalisation({ data, onChange, errors }: Props) {
  const communeOptions = data.region ? (COMMUNES[data.region] ?? []) : []

  function handleRegionChange(region: string) {
    onChange({ ...data, region, commune: null })
  }

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
        onChange={e => handleRegionChange(e.target.value)}
      />

      <Select
        id="commune"
        label="Commune / Arrondissement"
        options={communeOptions}
        placeholder={data.region ? 'Sélectionner votre commune' : 'Choisissez d\'abord une région'}
        value={data.commune ?? ''}
        error={errors.commune}
        disabled={!data.region}
        onChange={e => onChange({ ...data, commune: e.target.value || null })}
      />
    </div>
  )
}
