import { prisma } from '@/lib/prisma'

export interface MonthWindow {
  from: Date
  to: Date
  label: string
}

export interface GrowthPoint {
  month: string
  cumulative: number
}

/**
 * Série de croissance cumulée des inscriptions — définition UNIQUE partagée par le
 * tableau de bord et le data-hub (cf audit M1 : deux formules divergentes auparavant).
 *
 * Cumul HONNÊTE : pour chaque fin de mois, on compte les comptes réellement
 * existants à cette date — `createdAt <= finDuMois` ET non supprimés à cette date
 * (`deletedAt IS NULL OR deletedAt > finDuMois`). Plus de reconstitution par
 * soustraction depuis le total courant (qui ignorait les soft-deletes et pouvait
 * produire des valeurs négatives/biaisées).
 */
export async function getGrowthSeries(months: MonthWindow[]): Promise<GrowthPoint[]> {
  const counts = await Promise.all(
    months.map((m) =>
      prisma.utilisateur.count({
        where: {
          createdAt: { lte: m.to },
          OR: [{ deletedAt: null }, { deletedAt: { gt: m.to } }],
        },
      }),
    ),
  )
  return months.map((m, i) => ({ month: m.label, cumulative: counts[i] ?? 0 }))
}
