/**
 * GUIC-701 (PR-A) — Loader Utilisateurs admin : helpers purs de supervision.
 * Filtres rôle (jeune = null/jeune/beneficiaire) + statut + région + recherche, tri,
 * mapping ligne (masquage coordonnées si anonymisé ; complétude jeunes only), KPIs. TDD — RED.
 */
import {
  PAGE_SIZE_U,
  parseRoleU,
  parseStatutU,
  parseRegionU,
  parseSortU,
  buildUtilisateurWhere,
  orderByForSortU,
  mapUtilisateurRow,
  kpisUtilisateurs,
} from '@/lib/loaders/admin-utilisateurs'

describe('GUIC-701 — loader Utilisateurs (helpers)', () => {
  it('PAGE_SIZE_U = 20', () => { expect(PAGE_SIZE_U).toBe(20) })

  it('parseRoleU : jeune | conseiller | recruteur | admin, sinon ""', () => {
    expect(parseRoleU('jeune')).toBe('jeune')
    expect(parseRoleU('conseiller')).toBe('conseiller')
    expect(parseRoleU('admin')).toBe('admin')
    expect(parseRoleU('bidon')).toBe('')
    expect(parseRoleU(undefined)).toBe('')
  })

  it('parseStatutU / parseRegionU / parseSortU', () => {
    expect(parseStatutU('anonymise')).toBe('anonymise')
    expect(parseStatutU('x')).toBe('')
    expect(parseRegionU('Dakar')).toBe('Dakar')
    expect(parseRegionU('Atlantis')).toBe('')
    expect(parseSortU('completude')).toBe('completude')
    expect(parseSortU('seen')).toBe('seen')
    expect(parseSortU(undefined)).toBe('recent')
  })

  it('buildUtilisateurWhere : rôle « jeune » = null OU jeune OU beneficiaire', () => {
    const w = buildUtilisateurWhere({ q: '', role: 'jeune', statut: '', region: '' })
    // doit couvrir les 3 formes du bénéficiaire
    const s = JSON.stringify(w)
    expect(s).toMatch(/beneficiaire/)
    expect(s).toMatch(/"role":null|null/)
  })

  it('buildUtilisateurWhere : staff = rôle exact + statut + région + recherche', () => {
    const w = buildUtilisateurWhere({ q: 'awa', role: 'conseiller', statut: 'actif', region: 'Thies' })
    expect(w.role).toBe('conseiller')
    expect(w.statut).toBe('actif')
    expect(w.region).toBe('Thies')
    expect(JSON.stringify(w)).toMatch(/awa/)
    const empty = buildUtilisateurWhere({ q: '', role: '', statut: '', region: '' })
    expect(empty.role).toBeUndefined()
    expect(empty.statut).toBeUndefined()
    expect(empty.region).toBeUndefined()
    expect(empty.OR).toBeUndefined()
  })

  it('orderByForSortU : complétude / dernière visite (nulls last) / récent', () => {
    expect(orderByForSortU('completude')).toEqual([{ profil: { completionScore: 'desc' } }])
    expect(orderByForSortU('seen')).toEqual([{ lastSeenAt: { sort: 'desc', nulls: 'last' } }])
    expect(orderByForSortU('recent')).toEqual([{ createdAt: 'desc' }])
  })

  it('mapUtilisateurRow : masque les coordonnées si anonymisé, complétude jeunes only', () => {
    const base = { cjsUid: 'u1', prenom: 'Awa', nom: 'Diop', email: 'awa@ex.sn', telephone: '+221770000010', region: 'Dakar', lastSeenAt: new Date(), profil: { completionScore: 80 } }
    const jeune = mapUtilisateurRow({ ...base, role: null, statut: 'actif' })
    expect(jeune.email).toBe('awa@ex.sn')
    expect(jeune.completude).toBe(80) // jeune → complétude

    const staff = mapUtilisateurRow({ ...base, role: 'conseiller', statut: 'actif', profil: null })
    expect(staff.completude).toBeNull() // non-jeune → pas de complétude

    const anon = mapUtilisateurRow({ ...base, role: null, statut: 'anonymise' })
    expect(anon.email).toBeNull() // masqué
    expect(anon.telephone).toBeNull()
  })

  it('kpisUtilisateurs : comptes / jeunes (3 formes) / staff / complétude moyenne', () => {
    const k = kpisUtilisateurs({
      total: 22510,
      parRole: [
        { role: null, _count: { cjsUid: 20000 } },
        { role: 'jeune', _count: { cjsUid: 200 } },
        { role: 'beneficiaire', _count: { cjsUid: 64 } },
        { role: 'conseiller', _count: { cjsUid: 120 } },
        { role: 'recruteur', _count: { cjsUid: 100 } },
        { role: 'admin', _count: { cjsUid: 26 } },
      ],
      completudeMoyenne: 68.4,
    })
    expect(k.comptes).toBe(22510)
    expect(k.jeunes).toBe(20264) // null + jeune + beneficiaire
    expect(k.staff).toBe(246) // conseiller + recruteur + admin
    expect(k.completudeMoyenne).toBe(68) // arrondi
  })
})
