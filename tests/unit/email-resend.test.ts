/**
 * @jest-environment node
 *
 * Tests unitaires du primitive d'envoi email via Resend (GUIC-553 — bascule provider).
 * POST https://api.resend.com/emails · Bearer RESEND_API_KEY · from = RESEND_FROM.
 */
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { sendResendEmail } from '@/lib/email/resend'

let fetchMock: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  process.env.RESEND_API_KEY = 'rs_test_key'
  process.env.RESEND_FROM = 'Guichet Jeunesse <notifications@consortiumjeunessesenegal.org>'
  fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"id":"em_1"}' })
  global.fetch = fetchMock as unknown as typeof fetch
})

describe('sendResendEmail — API Resend', () => {
  it('poste sur https://api.resend.com/emails avec le Bearer', async () => {
    await sendResendEmail('dest@example.com', 'Sujet', '<p>Bonjour</p>', 'Bonjour')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer rs_test_key')
  })

  it('construit le payload from/to/subject/html/text', async () => {
    await sendResendEmail('dest@example.com', 'Candidature reçue', '<p>Bonjour</p>', 'Bonjour')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({
      from: 'Guichet Jeunesse <notifications@consortiumjeunessesenegal.org>',
      to: ['dest@example.com'],
      subject: 'Candidature reçue',
      html: '<p>Bonjour</p>',
      text: 'Bonjour',
    })
  })

  it('lève une erreur portant le status HTTP en cas d’échec', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: async () => 'invalid to' })
    await expect(sendResendEmail('x', 'S', '<p>x</p>', 'x')).rejects.toMatchObject({ status: 422 })
  })

  it('lève si RESEND_API_KEY est absent', async () => {
    delete process.env.RESEND_API_KEY
    await expect(sendResendEmail('x', 'S', '<p>x</p>', 'x')).rejects.toThrow(/RESEND_API_KEY/)
  })

  it('lève si RESEND_FROM est absent', async () => {
    delete process.env.RESEND_FROM
    await expect(sendResendEmail('x', 'S', '<p>x</p>', 'x')).rejects.toThrow(/RESEND_FROM/)
  })
})
