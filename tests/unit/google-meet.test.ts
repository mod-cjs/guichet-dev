/**
 * @jest-environment node
 *
 * Connexion Google Meet du recruteur : état, refresh, création de lien (fail-soft).
 */
const mockAuthFind = jest.fn()
const mockAuthUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    recruteurGoogleAuth: {
      findUnique: (...a: unknown[]) => mockAuthFind(...a),
      update: (...a: unknown[]) => mockAuthUpdate(...a),
    },
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { meetConfigured, buildMeetAuthUrl, getMeetEtat, creerLienMeet } from '@/lib/google-meet'

let fetchMock: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_MEET_CLIENT_ID = 'cid'
  process.env.GOOGLE_MEET_CLIENT_SECRET = 'csecret'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  fetchMock = jest.fn()
  global.fetch = fetchMock as unknown as typeof fetch
  mockAuthFind.mockResolvedValue(null)
  mockAuthUpdate.mockResolvedValue({})
})

describe('meetConfigured / buildMeetAuthUrl', () => {
  it('non configuré sans clés serveur', () => {
    delete process.env.GOOGLE_MEET_CLIENT_ID
    expect(meetConfigured()).toBe(false)
  })

  it("l'URL d'autorisation porte le client, le redirect et le state", () => {
    const url = new URL(buildMeetAuthUrl('state123'))
    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('state')).toBe('state123')
    expect(url.searchParams.get('redirect_uri')).toContain('/api/recruteur/google-meet/callback')
    expect(url.searchParams.get('access_type')).toBe('offline')
  })
})

describe('getMeetEtat', () => {
  it('non_configure sans clés (même si connecté en base)', async () => {
    delete process.env.GOOGLE_MEET_CLIENT_ID
    expect(await getMeetEtat('r1')).toEqual({ statut: 'non_configure', email: null })
  })

  it('non_connecte sans ligne en base', async () => {
    expect(await getMeetEtat('r1')).toEqual({ statut: 'non_connecte', email: null })
  })

  it('connecte avec tokens valides (email affiché)', async () => {
    mockAuthFind.mockResolvedValue({ googleEmail: 'rec@org.sn', expiresAt: new Date(Date.now() + 3600_000), refreshToken: 'r' })
    expect(await getMeetEtat('r1')).toEqual({ statut: 'connecte', email: 'rec@org.sn' })
  })

  it('expire quand le token est périmé sans refresh_token', async () => {
    mockAuthFind.mockResolvedValue({ googleEmail: 'rec@org.sn', expiresAt: new Date(Date.now() - 1000), refreshToken: null })
    expect((await getMeetEtat('r1')).statut).toBe('expire')
  })
})

describe('creerLienMeet', () => {
  const AUTH = { accessToken: 'tok', refreshToken: 'ref', expiresAt: new Date(Date.now() + 3600_000), googleEmail: 'r@x' }

  it('crée un événement Calendar avec Meet et renvoie le lien', async () => {
    mockAuthFind.mockResolvedValue(AUTH)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ hangoutLink: 'https://meet.google.com/abc-defg-hij' }) })
    const lien = await creerLienMeet('r1', { titre: 'Entretien', dateHeure: new Date('2026-08-01T10:00:00Z') })
    expect(lien).toBe('https://meet.google.com/abc-defg-hij')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('conferenceDataVersion=1')
    expect(JSON.parse(init.body).conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet')
  })

  it('rafraîchit le token expiré avant l’appel Calendar', async () => {
    mockAuthFind.mockResolvedValue({ ...AUTH, expiresAt: new Date(Date.now() - 1000) })
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok2', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hangoutLink: 'https://meet.google.com/xyz' }) })
    const lien = await creerLienMeet('r1', { titre: 'E', dateHeure: new Date() })
    expect(lien).toBe('https://meet.google.com/xyz')
    expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token')
    expect(mockAuthUpdate).toHaveBeenCalled()
  })

  it('fail-soft : non connecté → null sans appel API', async () => {
    expect(await creerLienMeet('r1', { titre: 'E', dateHeure: new Date() })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fail-soft : erreur API Calendar → null', async () => {
    mockAuthFind.mockResolvedValue(AUTH)
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) })
    expect(await creerLienMeet('r1', { titre: 'E', dateHeure: new Date() })).toBeNull()
  })

  it('non configuré → null immédiat', async () => {
    delete process.env.GOOGLE_MEET_CLIENT_ID
    expect(await creerLienMeet('r1', { titre: 'E', dateHeure: new Date() })).toBeNull()
  })
})
