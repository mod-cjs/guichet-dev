/**
 * @jest-environment node
 *
 * Tests unitaires du primitive d'envoi Orange SMS Pro (GUIC-552).
 * Contrat repris de la lib PHP de référence du SSO :
 *   key = HMAC-SHA1( token + subject + signature + recipient + content + timestamp , api_key )
 *   auth Basic login:token · GET query-string · recipient sans '+'.
 */
import { createHmac } from 'crypto'

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { sendOrangeSms } from '@/lib/sms/orange'

const ENV = {
  ORANGE_SMS_LOGIN: 'kiwimg1',
  ORANGE_SMS_API_KEY: 'secret_api_key',
  ORANGE_SMS_TOKEN: 'tok_123',
  ORANGE_SMS_SIGNATURE: 'KIWIST1',
  ORANGE_SMS_SUBJECT: 'Guichet',
  ORANGE_SMS_BASE_URL: 'https://api.orangesmspro.sn:8443/api',
  ORANGE_SMS_VERIFY_SSL: 'false',
}

const FIXED_TS = 1_700_000_000
let fetchMock: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  Object.assign(process.env, ENV)
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_TS * 1000)
  fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'OK' })
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  jest.restoreAllMocks()
})

function calledUrl(): URL {
  return new URL(fetchMock.mock.calls[0][0] as string)
}

describe('sendOrangeSms — contrat Orange SMS Pro', () => {
  it('appelle la base URL Orange en GET', async () => {
    await sendOrangeSms('+221770000000', 'Bonjour')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = calledUrl()
    expect(`${url.origin}${url.pathname}`).toBe('https://api.orangesmspro.sn:8443/api')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.method ?? 'GET').toUpperCase()).toBe('GET')
  })

  it('retire le préfixe + du destinataire (221XXXXXXXXX, pas E.164)', async () => {
    await sendOrangeSms('+221770000000', 'Bonjour')
    expect(calledUrl().searchParams.get('recipient')).toBe('221770000000')
  })

  it('envoie les bons paramètres (token, subject, signature, content, timestamp)', async () => {
    await sendOrangeSms('+221770000000', 'Bonjour')
    const p = calledUrl().searchParams
    expect(p.get('token')).toBe('tok_123')
    expect(p.get('subject')).toBe('Guichet')
    expect(p.get('signature')).toBe('KIWIST1')
    expect(p.get('content')).toBe('Bonjour')
    expect(p.get('timestamp')).toBe(String(FIXED_TS))
  })

  it('calcule la clé HMAC-SHA1 exactement selon le contrat', async () => {
    await sendOrangeSms('+221770000000', 'Bonjour')
    const recipient = '221770000000'
    const expected = createHmac('sha1', ENV.ORANGE_SMS_API_KEY)
      .update('tok_123' + 'Guichet' + 'KIWIST1' + recipient + 'Bonjour' + String(FIXED_TS))
      .digest('hex')
    expect(calledUrl().searchParams.get('key')).toBe(expected)
  })

  it('authentifie en HTTP Basic login:token', async () => {
    await sendOrangeSms('+221770000000', 'Bonjour')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const auth = (init.headers as Record<string, string>).Authorization
    const expected = 'Basic ' + Buffer.from('kiwimg1:tok_123').toString('base64')
    expect(auth).toBe(expected)
  })

  it('lève une erreur avec status sur réponse HTTP non-ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' })
    await expect(sendOrangeSms('+221770000000', 'X')).rejects.toMatchObject({ status: 400 })
  })
})
