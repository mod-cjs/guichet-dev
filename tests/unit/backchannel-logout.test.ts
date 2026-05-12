/**
 * @jest-environment node
 *
 * On garde jwtVerify réel (jose) mais on mock createRemoteJWKSet pour
 * retourner la clé publique directement, sans appel réseau.
 */

process.env.SSO_BASE_URL  = 'http://localhost:9999'
process.env.SSO_CLIENT_ID = 'guichet-test'

import { generateKeyPair, SignJWT } from 'jose'
import type { KeyLike } from 'jose'
import * as jose from 'jose'

// Garder jwtVerify réel, mocker uniquement createRemoteJWKSet
jest.mock('jose', () => {
  const actual = jest.requireActual<typeof import('jose')>('jose')
  return { ...actual, createRemoteJWKSet: jest.fn() }
})

const mockRevokeSession = jest.fn()

jest.mock('@/lib/session-store', () => ({
  revokeSession: (...args: unknown[]) => mockRevokeSession(...args),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}))

// Import après les mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/auth/backchannel-logout/route')

let privateKey: KeyLike
let publicKey: KeyLike

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA')
  privateKey  = pair.privateKey
  publicKey   = pair.publicKey

  // createRemoteJWKSet retourne une fonction qui donne la clé directement
  ;(jose.createRemoteJWKSet as jest.Mock).mockReturnValue(
    async (_: unknown) => publicKey
  )
})

beforeEach(() => jest.clearAllMocks())

async function signToken(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'EdDSA', kid: 'test-kid' })
    .setIssuer('http://localhost:9999')
    .setAudience('guichet-test')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey)
}

function makeRequest(body: string) {
  return {
    text: async () => body,
  } as unknown as import('next/server').NextRequest
}

const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'

describe('POST /api/auth/backchannel-logout', () => {
  it('retourne 400 si logout_token absent', async () => {
    const res = await POST(makeRequest(''))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/logout_token/i)
  })

  it('retourne 400 si le token JWT est invalide (signature fausse)', async () => {
    const res = await POST(makeRequest('logout_token=not-a-jwt'))
    expect(res.status).toBe(400)
  })

  it('retourne 400 si le payload contient un nonce (interdit RFC 9470)', async () => {
    const tok = await signToken({
      sub:    'uid-123',
      events: { [LOGOUT_EVENT]: {} },
      nonce:  'forbidden',
    })
    const res  = await POST(makeRequest(`logout_token=${tok}`))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/nonce/i)
  })

  it('retourne 400 si le claim events est absent', async () => {
    const tok = await signToken({ sub: 'uid-123' })
    const res  = await POST(makeRequest(`logout_token=${tok}`))
    expect(res.status).toBe(400)
  })

  it('retourne 400 si sub est absent', async () => {
    const tok = await signToken({ events: { [LOGOUT_EVENT]: {} } })
    const res  = await POST(makeRequest(`logout_token=${tok}`))
    expect(res.status).toBe(400)
  })

  it('révoque la session et retourne 200 pour un token valide', async () => {
    mockRevokeSession.mockResolvedValue(undefined)
    const tok = await signToken({ sub: 'uid-abc', events: { [LOGOUT_EVENT]: {} } })
    const res  = await POST(makeRequest(`logout_token=${tok}`))
    expect(res.status).toBe(200)
    expect(mockRevokeSession).toHaveBeenCalledWith('uid-abc')
  })
})
