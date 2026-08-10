/**
 * GUIC-704 · Lot 1 (RED) — helpers purs du loader de curation.
 */
import {
  PAGE_SIZE_C,
  parseOngletC,
  mapCurationRow,
  chipsCuration,
  filtrerCuration,
  type CurationRawRow,
} from '@/lib/loaders/admin-curation'

function raw(over: Partial<CurationRawRow> = {}): CurationRawRow {
  return {
    id: 'i1',
    titre: 'Développeur backend',
    scoreCompletude: 88,
    statut: 'a_valider',
    doublonDeId: null,
    payloadExtrait: { typeId: 't-emploi', region: 'Dakar', organisation: 'Wave', description: 'Un poste de dev backend.' },
    urlCanonique: 'https://demo.emploi.sn/offre/1',
    source: { nom: 'Emploi.sn', url: 'https://demo.emploi.sn/flux' },
    ...over,
  }
}

describe('GUIC-704 — loader curation (helpers purs)', () => {
  it('PAGE_SIZE_C = 20', () => expect(PAGE_SIZE_C).toBe(20))

  it('parseOngletC tolère l’inconnu → a_valider', () => {
    expect(parseOngletC('rejetee')).toBe('rejetee')
    expect(parseOngletC('n’importe')).toBe('a_valider')
    expect(parseOngletC(undefined)).toBe('a_valider')
  })

  it('mapCurationRow — item sain : score, extrait, signaux, pas doublon', () => {
    const r = mapCurationRow(raw(), 'Emploi')
    expect(r.typeLabel).toBe('Emploi')
    expect(r.score).toBe(88)
    expect(r.estDoublon).toBe(false)
    expect(r.extrait).toMatch(/dev backend/i)
    expect(r.signaux.length).toBeGreaterThan(0)
  })

  it('mapCurationRow — titre absent → « (sans titre) » + signal ⚠', () => {
    const r = mapCurationRow(raw({ titre: null }), null)
    expect(r.titre).toMatch(/sans titre/i)
    expect(r.signaux.some((s) => !s.ok && /titre/i.test(s.label))).toBe(true)
  })

  it('mapCurationRow — doublon', () => {
    expect(mapCurationRow(raw({ statut: 'doublon', doublonDeId: 'c1' }), 'Emploi').estDoublon).toBe(true)
  })

  it('mapCurationRow — complet exige titre ET typeId (garde-fou → Modération)', () => {
    expect(mapCurationRow(raw(), 'Emploi').complet).toBe(true)
    expect(mapCurationRow(raw({ titre: null }), null).complet).toBe(false)
    expect(mapCurationRow(raw({ payloadExtrait: { region: 'Dakar' } }), null).complet).toBe(false)
  })

  it('chipsCuration compte suggérées / score élevé (≥70) / doublons', () => {
    const rows = [
      mapCurationRow(raw({ id: 'a', scoreCompletude: 88 }), 'Emploi'),
      mapCurationRow(raw({ id: 'b', scoreCompletude: 42 }), 'Emploi'),
      mapCurationRow(raw({ id: 'c', statut: 'doublon', doublonDeId: 'a', scoreCompletude: 71 }), 'Emploi'),
    ]
    const k = chipsCuration(rows)
    expect(k.suggerees).toBe(3)
    expect(k.scoreEleve).toBe(2) // 88 et 71
    expect(k.doublons).toBe(1)
  })

  it('filtrerCuration applique le chip actif', () => {
    const rows = [
      mapCurationRow(raw({ id: 'a', scoreCompletude: 88 }), 'Emploi'),
      mapCurationRow(raw({ id: 'b', scoreCompletude: 42 }), 'Emploi'),
      mapCurationRow(raw({ id: 'c', statut: 'doublon', doublonDeId: 'a', scoreCompletude: 50 }), 'Emploi'),
    ]
    expect(filtrerCuration(rows, 'tout').map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(filtrerCuration(rows, 'score').map((r) => r.id)).toEqual(['a'])
    expect(filtrerCuration(rows, 'doublons').map((r) => r.id)).toEqual(['c'])
  })
})
