/**
 * GUIC-702 · PR-A (RED) — helpers purs du loader de modération.
 * Source dérivée (0 colonne « source »), ancienneté, mapping ligne, KPIs, filtres.
 */
import {
  PAGE_SIZE_M,
  parseFiltreMod,
  parseTriMod,
  deriveSourceMod,
  ageHeures,
  mapModerationRow,
  kpisModeration,
  filtrerModeration,
  trierModeration,
  filtrerAvance,
  idsVerifies,
  type ModerationRawRow,
} from '@/lib/loaders/admin-moderation'

const NOW = new Date('2026-08-05T12:00:00Z').getTime()

function raw(over: Partial<ModerationRawRow> = {}): ModerationRawRow {
  return {
    id: 'o1',
    slug: 'offre-1',
    titre: 'Stage marketing digital',
    type: 'Stage',
    typeRef: { libelle: 'Stage' },
    organisation: 'Wave Sénégal',
    organisationLibelle: 'Wave Sénégal',
    region: 'Dakar',
    recruteurUid: 'rec-1',
    createdAt: new Date(NOW - 3 * 3600 * 1000),
    description: 'Offre saine de stage marketing digital chez un partenaire vérifié.',
    remuneration: '150 000 FCFA/mois',
    org: { nom: 'Wave Sénégal', estVerifie: true },
    itemsCuration: [],
    deadline: null,
    ...over,
  }
}

describe('GUIC-702 — loader modération (helpers purs)', () => {
  it('PAGE_SIZE_M = 20', () => {
    expect(PAGE_SIZE_M).toBe(20)
  })

  it('parseFiltreMod tolère les valeurs inconnues → "tout"', () => {
    expect(parseFiltreMod('signalees')).toBe('signalees')
    expect(parseFiltreMod('veille')).toBe('veille')
    expect(parseFiltreMod('n’importe quoi')).toBe('tout')
    expect(parseFiltreMod(undefined)).toBe('tout')
  })

  it('deriveSourceMod — recruteur / veille / admin', () => {
    expect(deriveSourceMod({ recruteurUid: 'rec-1', itemsCuration: [] })).toBe('recruteur')
    expect(deriveSourceMod({ recruteurUid: null, itemsCuration: [{ id: 'i1' }] })).toBe('veille')
    expect(deriveSourceMod({ recruteurUid: null, itemsCuration: [] })).toBe('admin')
    // recruteur ET veille : la saisie recruteur prime (dépôt direct)
    expect(deriveSourceMod({ recruteurUid: 'rec-1', itemsCuration: [{ id: 'i1' }] })).toBe('recruteur')
  })

  it('ageHeures arrondit correctement', () => {
    expect(ageHeures(new Date(NOW - 26 * 3600 * 1000), NOW)).toBe(26)
    expect(ageHeures(new Date(NOW - 90 * 60 * 1000), NOW)).toBe(2)
  })

  it('mapModerationRow — offre saine vérifiée : source recruteur, pas de signal, pas urgent', () => {
    const r = mapModerationRow(raw(), NOW)
    expect(r.source).toBe('recruteur')
    expect(r.niveau).toBeNull()
    expect(r.urgent).toBe(false)
    expect(r.typeLabel).toBe('Stage')
    expect(r.organisation).toBe('Wave Sénégal')
  })

  it('mapModerationRow — frais + n° perso → niveau crit ; > 48 h → urgent', () => {
    const r = mapModerationRow(
      raw({
        createdAt: new Date(NOW - 60 * 3600 * 1000),
        org: { nom: 'Ets. Ndiaye', estVerifie: false },
        description:
          'Frais de dossier de 10 000 FCFA à verser. Appelez le +221 77 123 45 67.',
      }),
      NOW,
    )
    expect(r.niveau).toBe('crit')
    expect(r.urgent).toBe(true)
  })

  it('mapModerationRow — veille : source veille, aucun signal « partenaire »', () => {
    const r = mapModerationRow(
      raw({ recruteurUid: null, org: null, itemsCuration: [{ id: 'i1' }] }),
      NOW,
    )
    expect(r.source).toBe('veille')
    expect(r.niveau).toBeNull()
  })

  it('kpisModeration compte tout / signalées / nouvelles / recruteur / veille', () => {
    const rows = [
      mapModerationRow(raw({ id: 'a' }), NOW), // recruteur, sain, 3h (nouvelle)
      mapModerationRow(raw({ id: 'b', recruteurUid: null, org: null, itemsCuration: [{ id: 'i' }] }), NOW), // veille, 3h
      mapModerationRow(
        raw({ id: 'c', createdAt: new Date(NOW - 60 * 3600 * 1000), org: { nom: 'X', estVerifie: false } }),
        NOW,
      ), // recruteur soft, vieille
    ]
    const k = kpisModeration(rows)
    expect(k.tout).toBe(3)
    expect(k.recruteur).toBe(2)
    expect(k.veille).toBe(1)
    expect(k.signalees).toBe(1) // seule 'c' est signalée (soft)
    expect(k.nouvelles).toBe(2) // 'a' et 'b' < 24 h
  })

  it('mapModerationRow expose la localisation (région lisible) — écart C', () => {
    expect(mapModerationRow(raw({ region: 'Dakar' }), NOW).localisation).toMatch(/Dakar/)
    // pas de région → localisation vide, jamais "null"
    expect(mapModerationRow(raw({ region: null }), NOW).localisation).toBe('')
  })

  it('idsVerifies — offres sans aucun signal (partenaire vérifié, rien de suspect)', () => {
    const rows = [
      mapModerationRow(raw({ id: 'ok' }), NOW), // sain, vérifié → aucun signal
      mapModerationRow(raw({ id: 'soft', org: { nom: 'X', estVerifie: false } }), NOW), // soft
      mapModerationRow(
        raw({ id: 'crit', description: 'Frais d’inscription 10 000 FCFA à verser.' }),
        NOW,
      ), // crit
    ]
    expect(idsVerifies(rows)).toEqual(['ok'])
  })

  it('filtrerModeration applique le filtre actif', () => {
    const rows = [
      mapModerationRow(raw({ id: 'a' }), NOW),
      mapModerationRow(raw({ id: 'b', recruteurUid: null, org: null, itemsCuration: [{ id: 'i' }] }), NOW),
      mapModerationRow(
        raw({ id: 'c', createdAt: new Date(NOW - 60 * 3600 * 1000), org: { nom: 'X', estVerifie: false } }),
        NOW,
      ),
    ]
    expect(filtrerModeration(rows, 'tout')).toHaveLength(3)
    expect(filtrerModeration(rows, 'veille').map((r) => r.id)).toEqual(['b'])
    expect(filtrerModeration(rows, 'signalees').map((r) => r.id)).toEqual(['c'])
    expect(filtrerModeration(rows, 'recruteur').map((r) => r.id)).toEqual(['a', 'c'])
  })

  // GUIC-704 — tris + filtres avancés
  it('mapModerationRow expose typeSlug, regionCode et deadlineIso', () => {
    const r = mapModerationRow(raw({ type: 'emploi', region: 'Dakar', deadline: new Date('2026-09-30T00:00:00Z') }), NOW)
    expect(r.typeSlug).toBe('emploi')
    expect(r.regionCode).toBe('Dakar')
    expect(r.deadlineIso).toBe('2026-09-30')
    expect(mapModerationRow(raw({ deadline: null }), NOW).deadlineIso).toBeNull()
  })

  it('parseTriMod tolère les valeurs inconnues → "ancien"', () => {
    expect(parseTriMod('recent')).toBe('recent')
    expect(parseTriMod('echeance')).toBe('echeance')
    expect(parseTriMod('xyz')).toBe('ancien')
    expect(parseTriMod(undefined)).toBe('ancien')
  })

  it('trierModeration — ancien/recent/type/echeance', () => {
    const vieux = mapModerationRow(raw({ id: 'vieux', type: 'stage', typeRef: { libelle: 'Stage' }, createdAt: new Date(NOW - 50 * 3600 * 1000), deadline: new Date('2026-09-10T00:00:00Z') }), NOW)
    const recent = mapModerationRow(raw({ id: 'recent', type: 'emploi', typeRef: { libelle: 'Emploi' }, createdAt: new Date(NOW - 1 * 3600 * 1000), deadline: null }), NOW)
    const moyen = mapModerationRow(raw({ id: 'moyen', type: 'bourse', typeRef: { libelle: 'Bourse' }, createdAt: new Date(NOW - 10 * 3600 * 1000), deadline: new Date('2026-08-20T00:00:00Z') }), NOW)
    const rows = [recent, vieux, moyen]

    expect(trierModeration(rows, 'ancien').map((r) => r.id)).toEqual(['vieux', 'moyen', 'recent'])
    expect(trierModeration(rows, 'recent').map((r) => r.id)).toEqual(['recent', 'moyen', 'vieux'])
    expect(trierModeration(rows, 'type').map((r) => r.typeLabel)).toEqual(['Bourse', 'Emploi', 'Stage'])
    // échéance proche d'abord, deadline nulle en DERNIER
    expect(trierModeration(rows, 'echeance').map((r) => r.id)).toEqual(['moyen', 'vieux', 'recent'])
  })

  it('filtrerAvance — par type et/ou région (cumulables)', () => {
    const rows = [
      mapModerationRow(raw({ id: 'a', type: 'emploi', region: 'Dakar' }), NOW),
      mapModerationRow(raw({ id: 'b', type: 'stage', region: 'Dakar' }), NOW),
      mapModerationRow(raw({ id: 'c', type: 'emploi', region: 'Thies' }), NOW),
    ]
    expect(filtrerAvance(rows, {}).map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(filtrerAvance(rows, { typeSlug: 'emploi' }).map((r) => r.id)).toEqual(['a', 'c'])
    expect(filtrerAvance(rows, { regionCode: 'Dakar' }).map((r) => r.id)).toEqual(['a', 'b'])
    expect(filtrerAvance(rows, { typeSlug: 'emploi', regionCode: 'Dakar' }).map((r) => r.id)).toEqual(['a'])
  })
})
