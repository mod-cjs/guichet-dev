/**
 * @jest-environment node
 *
 * GUIC-487 (US-5) — Score d'adéquation candidat/offre (IA Vertex).
 * On teste les fonctions PURES : construction du prompt + parsing/clamp de la réponse.
 * L'appel LLM lui-même n'est pas testé (I/O réseau, fail-soft côté service) → le client
 * Vertex est mocké pour isoler ces fonctions du SDK.
 */
jest.mock('@/lib/ia/llm-client', () => ({ getLlmClient: jest.fn(), isLlmConfigured: () => true }))
jest.mock('@/lib/ia/llm-config', () => ({ getSlotModel: jest.fn().mockResolvedValue('google/gemini-2.5-flash') }))
import { buildAdequationMessages, parseScore, type AdequationInput } from '@/lib/recruteur/adequation'

const INPUT: AdequationInput = {
  offre: { titre: 'Développeur web', description: 'React et Node', niveauEtudeMin: 'BAC_PLUS_2', skills: ['JavaScript', 'React'] },
  candidat: { niveauEtude: 'BAC_PLUS_3', competences: ['JavaScript', 'Python'], lettreMotivation: 'Passionné de web.' },
}

describe('GUIC-487 — buildAdequationMessages', () => {
  it('le prompt user contient les signaux offre + candidat', () => {
    const { system, user } = buildAdequationMessages(INPUT)
    expect(system).toMatch(/JSON/i)
    expect(user).toContain('Développeur web')
    expect(user).toContain('React')
    expect(user).toContain('BAC_PLUS_2')
    expect(user).toContain('Python')
    expect(user).toContain('Passionné de web')
  })

  it('gère les champs vides sans planter', () => {
    const { user } = buildAdequationMessages({
      offre: { titre: 'X', description: '', niveauEtudeMin: null, skills: [] },
      candidat: { niveauEtude: null, competences: [], lettreMotivation: null },
    })
    expect(typeof user).toBe('string')
  })
})

describe('GUIC-487 — parseScore', () => {
  it('JSON valide → score entier + raison', () => {
    expect(parseScore('{"score": 82, "raison": "Bon match compétences"}')).toEqual({ score: 82, raison: 'Bon match compétences' })
  })

  it('score hors bornes → clampé 0–100', () => {
    expect(parseScore('{"score": 140, "raison": "x"}')?.score).toBe(100)
    expect(parseScore('{"score": -20, "raison": "x"}')?.score).toBe(0)
  })

  it('score décimal → arrondi', () => {
    expect(parseScore('{"score": 73.6, "raison": "x"}')?.score).toBe(74)
  })

  it('JSON invalide → null', () => {
    expect(parseScore('pas du json')).toBeNull()
  })

  it('champs manquants → null', () => {
    expect(parseScore('{"score": 50}')).toBeNull()
  })
})
