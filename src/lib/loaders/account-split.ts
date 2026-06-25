import { prisma } from '@/lib/prisma'

/**
 * Répartition des comptes utilisateurs — source unique partagée par le tableau de
 * bord ET le data-hub (évite les définitions divergentes, cf audit C1/C2).
 *
 * Catégories FIABLES uniquement : seuls « Bénéficiaires » et « Conseillers » sont
 * des comptes utilisateurs comptables de façon sûre aujourd'hui. `Utilisateur.role`
 * (GUIC-469) est mis en cache au LOGIN et n'est PAS rétro-rempli pour les comptes
 * existants → un split par rôle serait massivement NULL et donc faux. `AgentCentre`
 * est le seul signal fiable de « conseiller ». Le split par rôle pourra être ajouté
 * une fois `role` rétro-rempli (cf ticket de backfill).
 *
 * Les « organisations partenaires » sont une métrique SÉPARÉE : une organisation
 * n'est PAS un compte utilisateur (1 org ↔ N recruteurs) — elle ne doit donc pas
 * apparaître comme une tranche du donut « comptes ».
 */
export interface AccountSplitSegment {
  label: string
  value: number
  color: string
}

export interface AccountSplit {
  segments: AccountSplitSegment[]
  /** Somme des segments (= comptes utilisateurs catégorisés de façon fiable). */
  totalComptes: number
  /** Organisations partenaires — métrique séparée (≠ compte utilisateur). */
  partenairesOrganisations: number
}

/**
 * Construit la répartition à partir des comptes déjà fetchés (fonction PURE,
 * testable, source unique de la définition — appelée par les deux pages).
 */
export function buildAccountSplit(input: {
  total: number
  conseillers: number
  organisations: number
}): AccountSplit {
  const beneficiaires = Math.max(0, input.total - input.conseillers)
  return {
    segments: [
      { label: 'Bénéficiaires', value: beneficiaires, color: 'var(--gj-teal)' },
      { label: 'Conseillers', value: input.conseillers, color: 'var(--gj-teal-deep)' },
    ],
    totalComptes: beneficiaires + input.conseillers,
    partenairesOrganisations: input.organisations,
  }
}

export async function getAccountSplit(): Promise<AccountSplit> {
  const [total, conseillers, organisations] = await Promise.all([
    prisma.utilisateur.count({ where: { deletedAt: null } }),
    prisma.agentCentre.groupBy({ by: ['cjsUid'] }).then((r) => r.length),
    prisma.organisation.count(),
  ])
  return buildAccountSplit({ total, conseillers, organisations })
}
