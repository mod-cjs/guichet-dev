/**
 * @jest-environment node
 *
 * Tests du juge LLM Yaye (GUIC-435, jalon C, couche 3).
 * Vérifie : pseudonymisation, parsing JSON + clamp, garde-fous (drapeau rouge).
 */

const mockCreate = jest.fn()
jest.mock('@/lib/ia/llm-client', () => ({
  getLlmClient: () => ({ chat: { completions: { create: (...a: unknown[]) => mockCreate(...a) } } }),
  isLlmConfigured: () => true,
}))
jest.mock('@/lib/ia/llm-config', () => ({
  getSlotModel: jest.fn().mockResolvedValue('google/gemini-2.5-flash'),
  getSlotParams: jest.fn().mockResolvedValue({ temperature: 0, maxTokens: 400 }),
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { pseudonymizeText } from '@/lib/ia/metrics/pseudonymize'
import { judgeTranscript, formatTranscriptForJudge } from '@/lib/ia/metrics/judge'
import type { ReconstructedTranscript } from '@/lib/ia/metrics/transcript'

function transcript(): ReconstructedTranscript {
  return {
    sessionId: 's1',
    canal: 'whatsapp',
    cjsUid: 'uid',
    centreId: null,
    hasVerbatimText: true,
    turns: [
      {
        index: 0,
        userText: 'Mon numéro est +221770000000',
        userLength: 27,
        assistantText: 'Bonjour ! Voici des offres.',
        toolsUsed: ['search_opportunities'],
        toolResults: ['search_opportunities: 3 résultat(s) : Stage A · Stage B · Stage C'],
        intentions: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
        dureeMs: 400,
        escalade: false,
        erreur: false,
      },
    ],
    events: [],
    nbTours: 1,
    dureeMs: 400,
    escalade: false,
    debutMs: 0,
    finMs: 400,
  }
}

beforeEach(() => mockCreate.mockReset())

test('pseudonymizeText masque téléphone, email et UUID', () => {
  expect(pseudonymizeText('appelle +221770000000')).toContain('[téléphone]')
  expect(pseudonymizeText('mail a@b.com')).toContain('[email]')
  expect(pseudonymizeText('id 123e4567-e89b-12d3-a456-426614174000')).toContain('[id]')
})

test('formatTranscriptForJudge pseudonymise le texte verbatim', () => {
  const txt = formatTranscriptForJudge(transcript())
  expect(txt).toContain('[téléphone]')
  expect(txt).not.toContain('+221770000000')
  expect(txt).toContain('[outils appelés: search_opportunities]')
  // R1 : les données réellement fournies par les outils sont passées au juge.
  expect(txt).toContain('DONNÉES réellement fournies')
  expect(txt).toContain('3 résultat(s)')
})

test('judgeTranscript parse le JSON, clamp 0-1 et calcule le drapeau rouge', async () => {
  mockCreate.mockResolvedValueOnce({
    choices: [
      {
        message: {
          content: JSON.stringify({
            fidelite: 0.3, // < seuil 0.6 → drapeau rouge
            pertinence: 1.4, // clamp → 1
            utilite: 0.8,
            persona: 0.9,
            conformite_cdp: 0.95,
            langue: 1,
            commentaire: 'Réponse vague.',
          }),
        },
      },
    ],
  })

  const score = await judgeTranscript(transcript())
  expect(score).not.toBeNull()
  expect(score!.fidelite).toBe(0.3)
  expect(score!.pertinence).toBe(1) // clampé
  expect(score!.drapeauRouge).toBe(true) // fidélité sous seuil
  expect(score!.juge).toContain('vertex:')
})

test('judgeTranscript est fail-soft : JSON invalide → null', async () => {
  mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: 'pas du json' } }] })
  expect(await judgeTranscript(transcript())).toBeNull()
})

test('judgeTranscript est fail-soft : appel Groq qui throw → null', async () => {
  mockCreate.mockRejectedValueOnce(new Error('groq down'))
  expect(await judgeTranscript(transcript())).toBeNull()
})
