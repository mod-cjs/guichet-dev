/**
 * @jest-environment node
 *
 * N1 — Mémoire long terme de Yaye (memory.ts). Résumé persistant par cjsUid.
 * Réécrit sur le socle `tests/support/llm` : le rafraîchissement via LLM utilise le faux
 * client scriptable (fiche renvoyée, vide, ou panne → fail-soft). Redis est mocké.
 */

import { FakeLlm, say, boom } from '../support/llm/fake-llm'

const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() }
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockRedis.get(...a),
    set: (...a: unknown[]) => mockRedis.set(...a),
    del: (...a: unknown[]) => mockRedis.del(...a),
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

const mockLlm = new FakeLlm()
let mockConfigured = true
jest.mock('@/lib/ia/llm-client', () => ({
  getLlmClient: () => mockLlm.client,
  isLlmConfigured: () => mockConfigured,
}))
jest.mock('@/lib/ia/llm-config', () => ({ getSlotModel: jest.fn().mockResolvedValue('google/gemini-2.5-flash') }))

import { memoKey, loadSummary, saveSummary, purgeSummary, updateSummary } from '@/lib/ia/memory'

beforeEach(() => {
  mockLlm.reset()
  mockConfigured = true
  mockRedis.get.mockReset()
  mockRedis.set.mockReset()
  mockRedis.del.mockReset()
})

describe('clé et accès Redis', () => {
  test('memoKey préfixe par utilisateur', () => {
    expect(memoKey('u-42')).toBe('yaye:memo:u-42')
  })

  test('loadSummary renvoie la valeur stockée', async () => {
    mockRedis.get.mockResolvedValueOnce('- vise un stage en agro')
    expect(await loadSummary('u-1')).toBe('- vise un stage en agro')
    expect(mockRedis.get).toHaveBeenCalledWith('yaye:memo:u-1')
  })

  test('loadSummary : "" si absente', async () => {
    mockRedis.get.mockResolvedValueOnce(null)
    expect(await loadSummary('u-1')).toBe('')
  })

  test('loadSummary fail-soft : "" si Redis échoue', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('redis down'))
    expect(await loadSummary('u-1')).toBe('')
  })

  test('saveSummary borne la longueur (MAX_LEN) et pose un TTL long', async () => {
    await saveSummary('u-1', 'x'.repeat(5000))
    const [key, value, mode, ttl] = mockRedis.set.mock.calls[0]
    expect(key).toBe('yaye:memo:u-1')
    expect((value as string).length).toBe(700)
    expect(mode).toBe('EX')
    expect(ttl).toBe(90 * 24 * 3600)
  })

  test('saveSummary fail-soft : une panne Redis ne lève pas', async () => {
    mockRedis.set.mockRejectedValueOnce(new Error('redis down'))
    await expect(saveSummary('u-1', 'fiche')).resolves.toBeUndefined()
  })

  test('purgeSummary efface la fiche (droit à l’oubli CDP)', async () => {
    await purgeSummary('u-7')
    expect(mockRedis.del).toHaveBeenCalledWith('yaye:memo:u-7')
  })
})

describe('updateSummary (rafraîchissement via LLM)', () => {
  test('no-op si l’IA n’est pas configurée (ni modèle ni Redis)', async () => {
    mockConfigured = false
    await updateSummary('u-1', '(vide)', 'je cherche un stage', 'Voici des pistes.')
    expect(mockLlm.callCount).toBe(0)
    expect(mockRedis.set).not.toHaveBeenCalled()
  })

  test('persiste la fiche renvoyée par le modèle et lui fournit le dernier échange', async () => {
    mockLlm.load([say('- objectif : stage en agro\n- région : Thiès')])
    await updateSummary('u-7', '(vide)', 'je vise l’agro à Thiès', 'Noté, on cible Thiès.')

    expect(mockLlm.callCount).toBe(1)
    expect(mockRedis.set).toHaveBeenCalledWith(
      'yaye:memo:u-7',
      '- objectif : stage en agro\n- région : Thiès',
      'EX',
      90 * 24 * 3600,
    )
    expect(String(mockLlm.lastRequest.messages[1].content)).toContain('je vise l’agro à Thiès')
  })

  test('ne sauvegarde rien si le modèle renvoie du vide', async () => {
    mockLlm.load([say('   ')])
    await updateSummary('u-1', 'fiche', 'blabla', 'ok')
    expect(mockRedis.set).not.toHaveBeenCalled()
  })

  test('fail-soft : une panne du modèle ne lève pas et ne sauvegarde rien', async () => {
    mockLlm.load([boom('timeout Vertex')])
    await expect(updateSummary('u-1', 'fiche', 'blabla', 'ok')).resolves.toBeUndefined()
    expect(mockRedis.set).not.toHaveBeenCalled()
  })
})
