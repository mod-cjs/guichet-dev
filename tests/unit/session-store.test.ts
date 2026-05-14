import { activateSession, revokeSession, isSessionActive } from '@/lib/session-store'
import { redis } from '@/lib/redis'

jest.mock('@/lib/redis', () => ({
  redis: { set: jest.fn(), del: jest.fn(), get: jest.fn() },
}))

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn() },
}))

const mockRedis = redis as jest.Mocked<typeof redis>

const UID      = 'uuid-test-1234'
const REVOKED_KEY = `guichet:session:revoked:${UID}`

beforeEach(() => jest.clearAllMocks())

describe('activateSession', () => {
  it('ne fait aucun appel Redis (denylist — JWT est la source de vérité)', async () => {
    await activateSession(UID, 3600)
    expect(mockRedis.set).not.toHaveBeenCalled()
    expect(mockRedis.del).not.toHaveBeenCalled()
  })
})

describe('revokeSession', () => {
  it('écrit le marqueur revoked avec TTL 7 jours', async () => {
    mockRedis.set.mockResolvedValue('OK')
    await revokeSession(UID)
    expect(mockRedis.set).toHaveBeenCalledWith(REVOKED_KEY, 'revoked', 'EX', 7 * 24 * 3600)
  })

  it('ne throw pas si Redis est indisponible', async () => {
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(revokeSession(UID)).resolves.toBeUndefined()
  })
})

describe('isSessionActive', () => {
  it('retourne true si aucun marqueur de révocation (cas normal)', async () => {
    mockRedis.get.mockResolvedValue(null)
    expect(await isSessionActive(UID)).toBe(true)
  })

  it('retourne false si le marqueur revoked est présent', async () => {
    mockRedis.get.mockResolvedValue('revoked')
    expect(await isSessionActive(UID)).toBe(false)
  })

  it('retourne true (fail-open) si Redis est indisponible', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await isSessionActive(UID)).toBe(true)
  })
})
