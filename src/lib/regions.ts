/**
 * Régions du Sénégal — source de vérité côté code applicatif.
 *
 * Les `value` correspondent strictement à l'enum Prisma `Region`
 * (sans accents, `Saint_Louis`, `Sedhiou`, `Kedougou`, `Thies`)
 * pour permettre un cast direct `region as Region` dans les services.
 *
 * Les `label` portent les accents et la casse d'affichage.
 *
 * @see prisma/schema.prisma (enum Region)
 */

export interface RegionOption {
  /** Valeur stockée — strictement alignée sur l'enum Prisma. */
  value: string
  /** Libellé affiché à l'utilisateur (avec accents). */
  label: string
}

export const REGIONS_SENEGAL: readonly RegionOption[] = [
  { value: 'Dakar',       label: 'Dakar'       },
  { value: 'Thies',       label: 'Thiès'       },
  { value: 'Diourbel',    label: 'Diourbel'    },
  { value: 'Fatick',      label: 'Fatick'      },
  { value: 'Kaolack',     label: 'Kaolack'     },
  { value: 'Kaffrine',    label: 'Kaffrine'    },
  { value: 'Louga',       label: 'Louga'       },
  { value: 'Saint_Louis', label: 'Saint-Louis' },
  { value: 'Matam',       label: 'Matam'       },
  { value: 'Tambacounda', label: 'Tambacounda' },
  { value: 'Kedougou',    label: 'Kédougou'    },
  { value: 'Kolda',       label: 'Kolda'       },
  { value: 'Ziguinchor',  label: 'Ziguinchor'  },
  { value: 'Sedhiou',     label: 'Sédhiou'     },
] as const

export type RegionValue = (typeof REGIONS_SENEGAL)[number]['value']

/** Retourne le label affichable d'une région à partir de sa value. */
export function regionLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return REGIONS_SENEGAL.find(r => r.value === value)?.label ?? value
}

/** Vrai si la valeur correspond à une région connue. */
export function isValidRegion(value: unknown): value is RegionValue {
  return typeof value === 'string' && REGIONS_SENEGAL.some(r => r.value === value)
}
