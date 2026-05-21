/**
 * @jest-environment node
 */
import { SSOApiClient, type BulkUser, type SSOApiConfig } from './sso-api-client'

const baseConfig: SSOApiConfig = {
  baseUrl:     'https://sso.example.test',
  apiKey:      'test-api-key',
  apiSecret:   'test-api-secret',
  adminToken:  'test-admin-bearer',
}

describe('SSOApiClient', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    ;(globalThis as { fetch?: unknown }).fetch = fetchMock
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  // ── Construction ──────────────────────────────────────────────────────────

  it('exige apiKey, apiSecret et adminToken', () => {
    expect(() => new SSOApiClient({ ...baseConfig, apiKey: '' })).toThrow(/apiKey/)
    expect(() => new SSOApiClient({ ...baseConfig, apiSecret: '' })).toThrow(/apiSecret/)
    expect(() => new SSOApiClient({ ...baseConfig, adminToken: '' })).toThrow(/adminToken/)
  })

  // ── provisionBulk : signature HMAC + headers ──────────────────────────────

  it('provisionBulk envoie POST /users/provision/bulk avec headers HMAC + Bearer', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'completed', [])))
    const client = new SSOApiClient(baseConfig)

    await client.provisionBulk([sampleUser(1)])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://sso.example.test/users/provision/bulk')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['X-CJS-Api-Key']).toBe('test-api-key')
    expect(headers['X-CJS-Signature']).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex
    expect(headers['X-CJS-Timestamp']).toMatch(/^\d{10}$/)
    expect(headers['Authorization']).toBe('Bearer test-admin-bearer')
    expect(headers['Content-Type']).toBe('application/json')
  })

  // ── Chunking : 500 par batch ──────────────────────────────────────────────

  it('provisionBulk chunke en lots de 500', async () => {
    let n = 0
    fetchMock.mockImplementation((_url: string, init: { method: string }) =>
      Promise.resolve(init.method === 'POST'
        ? jsonResponse(202, { batch_id: `b${++n}`, status: 'queued', total: 0 })
        : jsonResponse(200, statusBody(`b${n}`, 'completed', []))),
    )
    const client = new SSOApiClient(baseConfig)

    const users: BulkUser[] = Array.from({ length: 1234 }, (_, i) => ({
      drupal_uid:      i + 1,
      first_name:      'User',
      last_name:       String(i),
      source_platform: 'drupal_migration',
    }))

    await client.provisionBulk(users)

    const postCalls = fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')
    expect(postCalls).toHaveLength(3) // 500 + 500 + 234
    const sentSizes = postCalls.map(([, init]) => JSON.parse(init.body).users.length)
    expect(sentSizes).toEqual([500, 500, 234])
  })

  it('provisionBulk agrège les results de tous les batches', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 500 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'completed', [
        { uuid: 'u1', cjs_uid: 'u1', drupal_uid: 1, created: true },
      ])))
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b2', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b2', 'completed', [
        { uuid: 'u2', cjs_uid: 'u2', drupal_uid: 2, created: false },
      ])))

    const client = new SSOApiClient({ ...baseConfig })
    const users: BulkUser[] = Array.from({ length: 501 }, (_, i) => ({
      drupal_uid:      i + 1,
      first_name:      'X',
      last_name:       'Y',
      source_platform: 'drupal_migration',
    }))

    const out = await client.provisionBulk(users)
    expect(out.results).toHaveLength(2)
    expect(out.results[0].drupal_uid).toBe(1)
    expect(out.results[1].drupal_uid).toBe(2)
  })

  // ── Polling du statut de lot (GUIC-17) ────────────────────────────────────

  it('provisionBulk poll jusqu\'au statut completed', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'processing', [])))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'completed', [
        { uuid: 'u1', cjs_uid: 'u1', drupal_uid: 1, created: true },
      ])))

    const client = new SSOApiClient({ ...baseConfig, pollIntervalMs: 1 })
    const out = await client.provisionBulk([sampleUser(1)])

    expect(out.results).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('provisionBulk propage l\'échec d\'un lot', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, {
        ...statusBody('b1', 'failed', []), error: 'boom',
      }))

    const client = new SSOApiClient({ ...baseConfig, pollIntervalMs: 1 })
    await expect(client.provisionBulk([sampleUser(1)])).rejects.toThrow(/échoué/)
  })

  it('provisionBulk : le GET de statut est signé et sans corps', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'completed', [])))

    const client = new SSOApiClient(baseConfig)
    await client.provisionBulk([sampleUser(1)])

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('https://sso.example.test/users/provision/bulk/b1')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    const headers = init.headers as Record<string, string>
    expect(headers['X-CJS-Signature']).toMatch(/^[0-9a-f]{64}$/)
  })

  // ── updateUser : PATCH /users/{uuid} ──────────────────────────────────────

  it('updateUser envoie PATCH avec body et options', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { uuid: 'abc' }))
    const client = new SSOApiClient(baseConfig)

    await client.updateUser('abc-uuid', { phone: '+221770000001' }, { onlyIfNull: true, silent: true })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://sso.example.test/users/abc-uuid')
    expect(init.method).toBe('PATCH')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      phone:        '+221770000001',
      only_if_null: true,
      silent:       true,
    })
  })

  it('updateUser retourne null sur 404 (pour itération masse)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: 'Utilisateur introuvable.' }))
    const client = new SSOApiClient(baseConfig)

    const result = await client.updateUser('inconnu', { region: 'Dakar' })
    expect(result).toBeNull()
  })

  it('updateUser throw sur 422', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { errors: { phone: ['invalide'] } }))
    const client = new SSOApiClient(baseConfig)

    await expect(client.updateUser('abc', { phone: 'bad' })).rejects.toThrow(/422/)
  })

  // ── Retry sur 5xx ──────────────────────────────────────────────────────────

  it('réessaie 2 fois sur 503 avant de propager', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { error: 'unavailable' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'unavailable' }))
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'completed', [])))

    const client = new SSOApiClient({ ...baseConfig, retryDelayMs: 1 })
    await client.provisionBulk([sampleUser(1)])
    expect(fetchMock).toHaveBeenCalledTimes(4) // POST ×3 (2 retries) + GET statut
  })

  it('propage l\'erreur après 3 échecs 5xx', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(500, { error: 'boom' })))
    const client = new SSOApiClient({ ...baseConfig, retryDelayMs: 1 })

    await expect(client.provisionBulk([sampleUser(1)])).rejects.toThrow(/500/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('respecte un 429 (retry_after) et réessaie', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { error: 'Too many requests.', retry_after: 0.01 }))
      .mockResolvedValueOnce(jsonResponse(202, { batch_id: 'b1', status: 'queued', total: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, statusBody('b1', 'completed', [])))

    const client = new SSOApiClient(baseConfig)
    await client.provisionBulk([sampleUser(1)])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  // ── Idempotence du tableau vide ───────────────────────────────────────────

  it('provisionBulk avec tableau vide ne fait aucun appel HTTP', async () => {
    const client = new SSOApiClient(baseConfig)
    const out = await client.provisionBulk([])
    expect(out.results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function statusBody(batchId: string, status: string, results: unknown[]) {
  return {
    batch_id:  batchId,
    status,
    total:     results.length,
    processed: status === 'completed' ? results.length : 0,
    results,
  }
}

function sampleUser(i: number): BulkUser {
  return {
    drupal_uid:      i,
    first_name:      'Test',
    last_name:       `User${i}`,
    source_platform: 'drupal_migration',
  }
}
