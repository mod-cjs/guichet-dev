/**
 * GUIC-558 (Phase 3 — health-check fournisseur LLM live) — pingProvider fait UN appel réel
 * minimal au fournisseur configuré pour le slot et en rapporte l'état (ok/latence/erreur),
 * sans jamais lever. Ici le client LLM est mocké (aucun appel payant/réseau en test) ; on
 * vérifie l'interprétation : succès, erreur fournisseur, timeout. Zéro état fabriqué.
 */
const mockCreate = jest.fn()
jest.mock('@/lib/ia/llm-client', () => ({
  getLlmClient: () => ({ chat: { completions: { create: mockCreate } } }),
}))
jest.mock('@/lib/ia/llm-config', () => ({
  getSlotModel: jest.fn(async () => 'google/gemini-2.5-flash'),
}))

import { pingProvider } from '@/lib/ia/admin/provider-health'

beforeEach(() => mockCreate.mockReset())

describe('GUIC-558 — pingProvider', () => {
  it('appel réussi → ok, latence mesurée, pas d’erreur', async () => {
    mockCreate.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: 'OK' } }] })
    const r = await pingProvider('agent')
    expect(r.ok).toBe(true)
    expect(r.model).toBe('google/gemini-2.5-flash')
    expect(r.slot).toBe('agent')
    expect(typeof r.latenceMs).toBe('number')
    expect(r.erreur).toBeNull()
  })

  it('le fournisseur lève (401/quota/réseau) → ok=false, message d’erreur, jamais d’exception', async () => {
    mockCreate.mockRejectedValue(new Error('401 Unauthorized: invalid credentials'))
    const r = await pingProvider('judge')
    expect(r.ok).toBe(false)
    expect(r.erreur).toMatch(/401|Unauthorized/i)
    expect(r.latenceMs).not.toBeNull()
  })

  it('réponse vide/malformée → ok=false (pas de choix exploitable)', async () => {
    mockCreate.mockResolvedValue({ choices: [] })
    const r = await pingProvider('adequation')
    expect(r.ok).toBe(false)
    expect(r.erreur).toBeTruthy()
  })

  it('passe thinking_budget=0 pour éviter la troncature (contenu réel)', async () => {
    mockCreate.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: 'OK' } }] })
    await pingProvider('agent')
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.extra_body?.google?.thinking_config?.thinking_budget).toBe(0)
    expect(arg.max_tokens).toBeGreaterThan(0)
  })
})
