/**
 * GUIC-704 · Lot 1 (RED) — signaux dérivés d'un item de curation (pur).
 * ✓ champs réellement extraits du payload · ⚠ titre manquant / doublon.
 */
import { signauxCuration } from '@/lib/curation/signaux'

const base = {
  titre: 'Développeur backend',
  payload: { typeId: 't-emploi', region: 'Dakar', organisation: 'Wave' } as Record<string, unknown>,
  statut: 'a_valider',
  doublonDeId: null as string | null,
  sourceUrl: 'https://demo.emploi.sn/flux',
}

describe('GUIC-704 — signauxCuration', () => {
  it('dérive ✓ Type / Région / Organisation depuis le payload', () => {
    const labels = signauxCuration(base).filter((s) => s.ok).map((s) => s.label).join(' | ')
    expect(labels).toMatch(/Type/i)
    expect(labels).toMatch(/R[ée]gion/i)
    expect(labels).toMatch(/Organisation/i)
  })

  it('⚠ Titre manquant quand titre absent', () => {
    const s = signauxCuration({ ...base, titre: null })
    expect(s.some((x) => !x.ok && /titre/i.test(x.label))).toBe(true)
  })

  it('⚠ Doublon détecté si statut doublon ou doublonDeId', () => {
    expect(signauxCuration({ ...base, statut: 'doublon' }).some((x) => !x.ok && /doublon/i.test(x.label))).toBe(true)
    expect(signauxCuration({ ...base, doublonDeId: 'c1' }).some((x) => !x.ok && /doublon/i.test(x.label))).toBe(true)
  })

  it('✓ Source officielle quand la source est gouv.sn', () => {
    const s = signauxCuration({ ...base, sourceUrl: 'https://der.gouv.sn/appels' })
    expect(s.some((x) => x.ok && /officielle/i.test(x.label))).toBe(true)
  })

  it('item sans type ni région → pas de ✓ correspondants (pas de fabrication)', () => {
    const s = signauxCuration({ ...base, payload: {} })
    expect(s.some((x) => x.ok && /Type/i.test(x.label))).toBe(false)
    expect(s.some((x) => x.ok && /R[ée]gion/i.test(x.label))).toBe(false)
  })
})
