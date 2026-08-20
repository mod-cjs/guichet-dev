/**
 * @jest-environment node
 *
 * GUIC-259 (#13) — aperçu de conversation inline : GET renvoie les DERNIERS tours d'une
 * session (verbatim si dispo, sinon structurel), pour trier une escalade sans quitter la
 * file. Garde canManageYaye. Route lecture seule.
 */
const mockGetSession = jest.fn()
const mockReconstruct = jest.fn()

jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('@/lib/ia/metrics/transcript', () => ({ reconstructTranscript: (...a: unknown[]) => mockReconstruct(...a) }))

import { GET } from '@/app/api/admin/yaye/sessions/[sessionId]/apercu/route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('http://localhost/api/admin/yaye/sessions/s1/apercu')
const params = { params: Promise.resolve({ sessionId: 's1' }) }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ cjsUid: 'staff-1', roles: ['conseiller'] })
})

describe('GUIC-259 #13 — GET apercu', () => {
  it('renvoie les 4 derniers tours + hasVerbatimText', async () => {
    mockReconstruct.mockResolvedValue({
      hasVerbatimText: true,
      turns: Array.from({ length: 7 }, (_, i) => ({
        index: i, userText: `u${i}`, assistantText: `a${i}`, toolsUsed: ['search_opportunities'], escalade: i === 6,
      })),
    })
    const res = await GET(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.hasVerbatimText).toBe(true)
    expect(json.data.turns).toHaveLength(4) // les 4 derniers
    expect(json.data.turns[3].userText).toBe('u6')
    expect(json.data.turns[3].escalade).toBe(true)
  })

  it('sans droit → 403', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u', roles: ['beneficiaire'] })
    const res = await GET(req(), params)
    expect(res.status).toBe(403)
    expect(mockReconstruct).not.toHaveBeenCalled()
  })
})
