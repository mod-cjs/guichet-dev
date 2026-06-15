'use client'
import type { TypeOpportunite } from '@prisma/client'
import { Tabs, type TabItem } from '@/components/ui/Tabs'

/** Libellés FR pluriels pour les onglets de filtre (GUIC-409). */
const TYPE_TAB_LABEL: Record<TypeOpportunite, string> = {
  Emploi: 'Emplois',
  Stage: 'Stages',
  Formation: 'Formations',
  Bourse: 'Bourses',
  Volontariat: 'Volontariat',
  Appel_a_projets: 'Appels à projets',
}

/** Ordre canonique des types dans la barre d'onglets. */
const TYPE_ORDER: TypeOpportunite[] = [
  'Emploi',
  'Stage',
  'Formation',
  'Bourse',
  'Volontariat',
  'Appel_a_projets',
]

export type OpportunitesTabsCounts = Partial<Record<TypeOpportunite, number>> & {
  all?: number
}

export interface OpportunitesTabsProps {
  /** Valeur enum Prisma courante. `undefined` => onglet "Toutes" actif. */
  value: TypeOpportunite | undefined
  /** Callback : `undefined` quand "Toutes" est sélectionné. */
  onChange: (value: TypeOpportunite | undefined) => void
  /** Compteurs par type + total `all`. */
  counts: OpportunitesTabsCounts
  className?: string
}

const ALL_VALUE = '__all__'

/**
 * <OpportunitesTabs /> — onglets de filtrage par type d'opportunité.
 *
 * GUIC-409. Wrap la primitive <Tabs /> avec les libellés FR pluriels et
 * la conversion enum Prisma ↔ valeur d'onglet. L'onglet "Toutes" mappe
 * vers `undefined` côté URL (filtres opportunités).
 */
export function OpportunitesTabs({
  value,
  onChange,
  counts,
  className,
}: OpportunitesTabsProps) {
  const items: TabItem[] = [
    {
      value: ALL_VALUE,
      label: 'Toutes',
      ...(typeof counts.all === 'number' ? { count: counts.all } : {}),
    },
    ...TYPE_ORDER.map((t) => ({
      value: t,
      label: TYPE_TAB_LABEL[t],
      ...(typeof counts[t] === 'number' ? { count: counts[t] } : {}),
    })),
  ]

  return (
    <Tabs
      ariaLabel="Filtrer par type d'opportunité"
      items={items}
      value={value ?? ALL_VALUE}
      onChange={(v) => onChange(v === ALL_VALUE ? undefined : (v as TypeOpportunite))}
      className={className}
    />
  )
}
