/**
 * GUIC-704 — loader Partenaires (helpers purs) : agrégats réels par organisation,
 * statut du compte recruteur, filtres (secteur/statut) et tri. Même niveau que
 * curation/modération. La partie DB de `getPartenairesData` est couverte en intégration.
 */
import {
  parseStatutPartenaire,
  parseTriPartenaire,
  agregerOpportunites,
  mapPartenaireRow,
  kpisPartenaires,
  filtrerPartenaires,
  trierPartenaires,
  debutDuMois,
  type PartenaireRow,
  type OrgRaw,
} from '@/lib/loaders/admin-partenaires'

const NOW = new Date('2026-08-10T00:00:00Z')

function raw(over: Partial<OrgRaw> = {}): OrgRaw {
  return {
    id: 'o1', nom: 'Wave Sénégal', description: null, logoUrl: null,
    secteur: 'Numerique', region: 'Dakar', email: 'rh@wave.sn', estVerifie: true,
    statut: 'active', cjsUid: 'rec-1', createdAt: new Date('2026-08-01T00:00:00Z'), ...over,
  }
}

describe('GUIC-704 — loader partenaires (helpers purs)', () => {
  it('parseStatutPartenaire / parseTriPartenaire tolèrent l’inconnu', () => {
    expect(parseStatutPartenaire('suspendus')).toBe('suspendus')
    expect(parseStatutPartenaire('verifies')).toBe('verifies')
    expect(parseStatutPartenaire('xyz')).toBe('tous')
    expect(parseTriPartenaire('candidatures')).toBe('candidatures')
    expect(parseTriPartenaire(undefined)).toBe('nom')
  })

  it('agregerOpportunites : total / publiées / candidatures par organisation', () => {
    const agg = agregerOpportunites([
      { organisationId: 'o1', statut: 'publiee', nbCandidatures: 5 },
      { organisationId: 'o1', statut: 'brouillon', nbCandidatures: 0 },
      { organisationId: 'o1', statut: 'publiee', nbCandidatures: 3 },
      { organisationId: 'o2', statut: 'archivee', nbCandidatures: 1 },
    ])
    expect(agg.o1).toEqual({ total: 3, publiees: 2, candidatures: 8 })
    expect(agg.o2).toEqual({ total: 1, publiees: 0, candidatures: 1 })
    expect(agg.inconnu).toBeUndefined()
  })

  it('mapPartenaireRow : joint agrégats + statut du compte recruteur', () => {
    const r = mapPartenaireRow(raw(), { total: 4, publiees: 2, candidatures: 12 }, 'inactif')
    expect(r.opportunitesCount).toBe(4)
    expect(r.publieesCount).toBe(2)
    expect(r.candidaturesCount).toBe(12)
    expect(r.recruteurStatut).toBe('inactif') // statut du COMPTE (personne)
    expect(r.statut).toBe('active') // statut de l'ORG (levier org-level)
    expect(r.secteur).toBe('Numerique')
    // agrégat/statut absents → défauts sûrs (0 / inconnu)
    const r2 = mapPartenaireRow(raw({ id: 'o9' }), undefined, undefined)
    expect(r2.opportunitesCount).toBe(0)
    expect(r2.recruteurStatut).toBe('inconnu')
  })

  it('kpisPartenaires : suspendus = ORG suspendue (org-level, GUIC-705)', () => {
    const rows = [
      mapPartenaireRow(raw({ id: 'a', estVerifie: true }), undefined, 'actif'),
      mapPartenaireRow(raw({ id: 'b', estVerifie: false }), undefined, 'actif'),
      mapPartenaireRow(raw({ id: 'c', estVerifie: true, statut: 'suspendue' }), undefined, 'actif'), // ORG suspendue
    ]
    const k = kpisPartenaires(rows)
    expect(k.tous).toBe(3)
    expect(k.verifies).toBe(2)
    expect(k.nonVerifies).toBe(1)
    expect(k.suspendus).toBe(1) // Organisation.statut === 'suspendue'
  })

  it('filtrerPartenaires : suspendus = ORG suspendue (pas le compte recruteur)', () => {
    const rows = [
      mapPartenaireRow(raw({ id: 'a', estVerifie: true }), undefined, 'actif'),
      mapPartenaireRow(raw({ id: 'b', estVerifie: false }), undefined, 'inactif'), // compte inactif MAIS org active → pas suspendu
      mapPartenaireRow(raw({ id: 'c', estVerifie: true, statut: 'suspendue' }), undefined, 'actif'),
    ]
    expect(filtrerPartenaires(rows, 'tous').map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(filtrerPartenaires(rows, 'verifies').map((r) => r.id)).toEqual(['a', 'c'])
    expect(filtrerPartenaires(rows, 'non_verifies').map((r) => r.id)).toEqual(['b'])
    expect(filtrerPartenaires(rows, 'suspendus').map((r) => r.id)).toEqual(['c']) // seule l'org suspendue
  })

  it('debutDuMois : premier jour du mois courant en UTC (pour le trend « +N ce mois »)', () => {
    expect(debutDuMois(new Date('2026-08-10T12:34:00Z')).toISOString()).toBe('2026-08-01T00:00:00.000Z')
    expect(debutDuMois(new Date('2026-01-31T23:59:00Z')).toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('trierPartenaires : nom / offres / candidatures / récent', () => {
    const a = mapPartenaireRow(raw({ id: 'a', nom: 'Alpha', createdAt: new Date('2026-01-01') }), { total: 1, publiees: 1, candidatures: 2 }, 'actif')
    const b = mapPartenaireRow(raw({ id: 'b', nom: 'Zeta', createdAt: new Date('2026-08-09') }), { total: 9, publiees: 5, candidatures: 40 }, 'actif')
    const c = mapPartenaireRow(raw({ id: 'c', nom: 'Mango', createdAt: new Date('2026-05-01') }), { total: 3, publiees: 3, candidatures: 10 }, 'actif')
    const rows = [a, b, c]
    expect(trierPartenaires(rows, 'nom').map((r) => r.nom)).toEqual(['Alpha', 'Mango', 'Zeta'])
    expect(trierPartenaires(rows, 'offres').map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect(trierPartenaires(rows, 'candidatures').map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect(trierPartenaires(rows, 'recent').map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
})

// garde-fou : PartenaireRow reste sérialisable (passé à un client component)
it('PartenaireRow expose les champs attendus', () => {
  const r: PartenaireRow = mapPartenaireRow(raw(), { total: 1, publiees: 1, candidatures: 1 }, 'actif')
  expect(Object.keys(r)).toEqual(
    expect.arrayContaining(['id', 'nom', 'secteur', 'estVerifie', 'opportunitesCount', 'publieesCount', 'candidaturesCount', 'recruteurStatut']),
  )
})
