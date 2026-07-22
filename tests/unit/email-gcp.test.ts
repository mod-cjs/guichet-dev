/**
 * @jest-environment node
 *
 * Tests unitaires du primitive d'envoi email via GCP / Gmail API (GUIC-553).
 * Auth = service account (GOOGLE_APPLICATION_CREDENTIALS) avec domain-wide delegation
 * impersonant GCP_EMAIL_SENDER, scope gmail.send.
 */
const mockSend = jest.fn()
const mockGmail = jest.fn((_opts?: unknown) => ({ users: { messages: { send: mockSend } } }))
const mockGoogleAuth = jest.fn()

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: class {
        constructor(opts: unknown) {
          mockGoogleAuth(opts)
        }
      },
    },
    gmail: (opts: unknown) => mockGmail(opts),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { sendGcpEmail } from '@/lib/email/gcp'

function decodedRaw(): string {
  const raw = mockSend.mock.calls[0][0].requestBody.raw as string
  return Buffer.from(raw, 'base64url').toString('utf-8')
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GCP_EMAIL_SENDER = 'notifications@consortiumjeunessesenegal.org'
  mockSend.mockResolvedValue({ data: { id: 'msg1' } })
})

describe('sendGcpEmail — Gmail API', () => {
  it('envoie via gmail.users.messages.send avec userId "me"', async () => {
    await sendGcpEmail('dest@example.com', 'Sujet', '<p>Bonjour</p>', 'Bonjour')
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0][0].userId).toBe('me')
  })

  it('construit un message MIME avec From (sender), To et multipart/alternative', async () => {
    await sendGcpEmail('dest@example.com', 'Sujet', '<p>Bonjour</p>', 'Bonjour')
    const raw = decodedRaw()
    expect(raw).toContain('To: dest@example.com')
    expect(raw).toContain('notifications@consortiumjeunessesenegal.org')
    expect(raw).toMatch(/Content-Type: multipart\/alternative/i)
    expect(raw).toContain('<p>Bonjour</p>')
    expect(raw).toContain('Bonjour')
  })

  it('encode le sujet en encoded-word UTF-8 (accents)', async () => {
    await sendGcpEmail('dest@example.com', 'Candidature reçue', '<p>x</p>', 'x')
    expect(decodedRaw()).toMatch(/Subject: =\?UTF-8\?B\?/)
  })

  it('authentifie avec le scope gmail.send et impersonation du sender', async () => {
    await sendGcpEmail('dest@example.com', 'Sujet', '<p>x</p>', 'x')
    const opts = mockGoogleAuth.mock.calls[0][0] as {
      scopes: string[]
      clientOptions: { subject: string }
    }
    expect(opts.scopes).toContain('https://www.googleapis.com/auth/gmail.send')
    expect(opts.clientOptions.subject).toBe('notifications@consortiumjeunessesenegal.org')
  })

  it('propage l’erreur si l’envoi échoue', async () => {
    mockSend.mockRejectedValue(new Error('gmail 500'))
    await expect(sendGcpEmail('dest@example.com', 'S', '<p>x</p>', 'x')).rejects.toThrow('gmail 500')
  })

  it('lève si GCP_EMAIL_SENDER est absent', async () => {
    delete process.env.GCP_EMAIL_SENDER
    await expect(sendGcpEmail('dest@example.com', 'S', '<p>x</p>', 'x')).rejects.toThrow(
      /GCP_EMAIL_SENDER/,
    )
  })
})
