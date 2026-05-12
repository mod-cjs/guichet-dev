import { activateSession, revokeSession, isSessionActive } from '@/lib/session-store'
import { redis } from '@/lib/redis'

jest.mock('@/lib/redis', () => ({
  redis: { set: jest.fn(), del: jest.fn(), get: jest.fn() },
}))

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn() },
}))

const mockRedis = redis as jest.Mocked<typeof redis>

const UID = 'uuid-test-1234'
const KEY = `guichet:session:${UID}`

beforeEach(() => jest.clearAllMocks())

describe('activateSession', () => {
  it('stocke la clé avec TTL en Redis', async () => {
    mockRedis.set.mockResolvedValue('OK')
    await activateSession(UID, 3600)
    expect(mockRedis.set).toHaveBeenCalledWith(KEY, '1', 'EX', 3600)
  })

  it('force un TTL minimum de 60s', async () => {
    mockRedis.set.mockResolvedValue('OK')
    await activateSession(UID, 10)
    expect(mockRedis.set).toHaveBeenCalledWith(KEY, '1', 'EX', 60)
  })

  it('ne throw pas si Redis est indisponible', async () => {
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(activateSession(UID, 3600)).resolves.toBeUndefined()
  })
})

describe('revokeSession', () => {
  it('supprime la clé Redis', async () => {
    mockRedis.del.mockResolvedValue(1)
    await revokeSession(UID)
    expect(mockRedis.del).toHaveBeenCalledWith(KEY)
  })

  it('ne throw pas si Redis est indisponible', async () => {
    mockRedis.del.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(revokeSession(UID)).resolves.toBeUndefined()
  })
})

describe('isSessionActive', () => {
  it('retourne true si la clé existe', async () => {
    mockRedis.get.mockResolvedValue('1')
    expect(await isSessionActive(UID)).toBe(true)
  })

  it('retourne false si la clé est absente (session révoquée)', async () => {
    mockRedis.get.mockResolvedValue(null)
    expect(await isSessionActive(UID)).toBe(false)
  })

  it('retourne true (fail-open) si Redis est indisponible', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await isSessionActive(UID)).toBe(true)
  })
})
