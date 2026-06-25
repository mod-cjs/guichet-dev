/**
 * Audit C1/C2 — buildAccountSplit : définition UNIQUE de la répartition des comptes,
 * partagée par le tableau de bord et le data-hub (réconcilie les deux écrans).
 */
import { buildAccountSplit } from '@/lib/loaders/account-split'

describe('buildAccountSplit (C1/C2)', () => {
  it('Bénéficiaires = total − conseillers, Conseillers = conseillers', () => {
    const a = buildAccountSplit({ total: 1000, conseillers: 50, organisations: 412 })
    expect(a.segments).toEqual([
      { label: 'Bénéficiaires', value: 950, color: 'var(--gj-teal)' },
      { label: 'Conseillers', value: 50, color: 'var(--gj-teal-deep)' },
    ])
  })

  it('totalComptes = somme des segments (et NON total + orgs)', () => {
    const a = buildAccountSplit({ total: 1000, conseillers: 50, organisations: 412 })
    expect(a.totalComptes).toBe(1000) // 950 + 50, pas 1000 + 412
  })

  it('les organisations partenaires sont une métrique SÉPARÉE (pas une tranche)', () => {
    const a = buildAccountSplit({ total: 1000, conseillers: 50, organisations: 412 })
    expect(a.partenairesOrganisations).toBe(412)
    expect(a.segments.some((s) => /recruteur|organisation|partenaire/i.test(s.label))).toBe(false)
    expect(a.segments).toHaveLength(2)
  })

  it('Bénéficiaires jamais négatif (clamp si conseillers > total)', () => {
    const a = buildAccountSplit({ total: 10, conseillers: 50, organisations: 0 })
    expect(a.segments[0].value).toBe(0)
    expect(a.totalComptes).toBe(50) // 0 + 50
  })
})
