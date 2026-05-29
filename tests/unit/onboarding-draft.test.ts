/**
 * @jest-environment jsdom
 */
import { readDraft, patchDraft, clearDraft } from '@/lib/onboarding-draft'

describe('onboarding-draft (sessionStorage)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('retourne un draft vide par défaut', () => {
    expect(readDraft()).toEqual({ objectifs: [] })
  })

  it('patchDraft persiste et merge avec l\'état existant', () => {
    patchDraft({ prenom: 'Awa', objectifs: ['emploi'] })
    expect(readDraft()).toMatchObject({ prenom: 'Awa', objectifs: ['emploi'] })

    patchDraft({ nom: 'Diop', region: 'Tambacounda' })
    const after = readDraft()
    expect(after.prenom).toBe('Awa')
    expect(after.nom).toBe('Diop')
    expect(after.region).toBe('Tambacounda')
    expect(after.objectifs).toEqual(['emploi'])
  })

  it('clearDraft retire toutes les clés', () => {
    patchDraft({ prenom: 'Awa' })
    clearDraft()
    expect(readDraft()).toEqual({ objectifs: [] })
  })

  it('tolère un JSON corrompu en sessionStorage', () => {
    window.sessionStorage.setItem('gj_onboarding_draft_v2', '{not json')
    expect(readDraft()).toEqual({ objectifs: [] })
  })

  it('objectifs absent → tableau vide (jamais undefined)', () => {
    window.sessionStorage.setItem('gj_onboarding_draft_v2', JSON.stringify({ prenom: 'X' }))
    expect(readDraft().objectifs).toEqual([])
  })
})
