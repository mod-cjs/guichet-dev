/**
 * Filtres transverses du tableau de bord admin (GUIC-679 · phase 2).
 * Période + région → drill-down national↔local. Logique PURE (testable).
 */
import { REGIONS_SENEGAL } from '@/lib/regions'

export type Periode = 'mois' | 'trimestre' | 'annee' | '12mois'

export interface DashboardFilters {
  periode: Periode
  /** Valeur d'enum Region, ou 'all' (national). */
  region: string
}

export const PERIODES: { value: Periode; label: string }[] = [
  { value: 'mois', label: 'Ce mois' },
  { value: 'trimestre', label: '3 mois' },
  { value: 'annee', label: 'Année' },
  { value: '12mois', label: '12 mois' },
]

const PERIODE_VALUES = PERIODES.map((p) => p.value)
const REGION_VALUES = REGIONS_SENEGAL.map((r) => r.value)

export function periodeLabel(p: Periode): string {
  return PERIODES.find((x) => x.value === p)?.label ?? '12 mois'
}

/** Parse les searchParams en filtres normalisés (défaut : 12 mois, national). */
export function parseFilters(sp: { periode?: string; region?: string }): DashboardFilters {
  const periode = (PERIODE_VALUES as string[]).includes(sp.periode ?? '') ? (sp.periode as Periode) : '12mois'
  const region = (REGION_VALUES as string[]).includes(sp.region ?? '') ? (sp.region as string) : 'all'
  return { periode, region }
}

/** Date de début de la période (bornée), relative à `now`. */
export function periodeFrom(periode: Periode, now: Date): Date {
  switch (periode) {
    case 'mois':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'annee':
      return new Date(now.getFullYear(), 0, 1)
    case 'trimestre':
      return new Date(now.getTime() - 90 * 86_400_000)
    case '12mois':
    default:
      return new Date(now.getTime() - 365 * 86_400_000)
  }
}
