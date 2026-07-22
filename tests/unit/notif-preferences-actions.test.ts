/**
 * @jest-environment node
 *
 * GUIC-554 — Préférences de notification par canal (côté utilisateur).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { notificationPreference: { findMany: jest.fn(), upsert: jest.fn() } },
}))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadMyChannelPreferences, setChannelPreference } from '@/lib/notifications/preferences'

const mockSession = getSession as jest.Mock
const mockPrisma = prisma as unknown as {
  notificationPreference: { findMany: jest.Mock; upsert: jest.Mock }
}
const USER = { cjsUid: 'u1', roles: ['beneficiaire'] }

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(USER)
  mockPrisma.notificationPreference.findMany.mockResolvedValue([])
  mockPrisma.notificationPreference.upsert.mockResolvedValue({})
})

describe('loadMyChannelPreferences', () => {
  it('non authentifié → erreur', async () => {
    mockSession.mockResolvedValue(null)
    await expect(loadMyChannelPreferences()).rejects.toThrow(/UNAUTHENTICATED/)
  })

  it('renvoie les 4 canaux ; in_app consenti et sans consentement requis', async () => {
    const prefs = await loadMyChannelPreferences()
    expect(prefs.map((p) => p.canal)).toEqual(['in_app', 'whatsapp', 'sms', 'email'])
    const inApp = prefs.find((p) => p.canal === 'in_app')!
    expect(inApp).toMatchObject({ consentGiven: true, requiresConsent: false })
    const sms = prefs.find((p) => p.canal === 'sms')!
    expect(sms).toMatchObject({ consentGiven: false, requiresConsent: true })
  })

  it('reflète une ligne de consentement existante', async () => {
    mockPrisma.notificationPreference.findMany.mockResolvedValue([
      { canal: 'sms', consentGiven: true, enabled: true },
    ])
    const prefs = await loadMyChannelPreferences()
    expect(prefs.find((p) => p.canal === 'sms')).toMatchObject({ consentGiven: true })
  })
})

describe('setChannelPreference', () => {
  it('upsert le consentement avec consentAt + source lors de l’opt-in', async () => {
    await setChannelPreference('sms', { consentGiven: true })
    const call = mockPrisma.notificationPreference.upsert.mock.calls[0][0]
    expect(call.where.cjsUid_canal).toEqual({ cjsUid: 'u1', canal: 'sms' })
    expect(call.update.consentGiven).toBe(true)
    expect(call.update.consentAt).toBeInstanceOf(Date)
    expect(call.update.consentSource).toBe('params')
  })

  it('retire le consentement (consentAt/source à null) lors de l’opt-out', async () => {
    await setChannelPreference('email', { consentGiven: false })
    const call = mockPrisma.notificationPreference.upsert.mock.calls[0][0]
    expect(call.update.consentGiven).toBe(false)
    expect(call.update.consentAt).toBeNull()
  })

  it('refuse de configurer in_app', async () => {
    await expect(setChannelPreference('in_app', { enabled: false })).rejects.toThrow(/in-app/i)
    expect(mockPrisma.notificationPreference.upsert).not.toHaveBeenCalled()
  })

  it('rejette un canal invalide', async () => {
    await expect(setChannelPreference('pigeon', { enabled: true })).rejects.toThrow(/invalide/i)
  })

  it('non authentifié → erreur, aucune écriture', async () => {
    mockSession.mockResolvedValue(null)
    await expect(setChannelPreference('sms', { enabled: true })).rejects.toThrow(/UNAUTHENTICATED/)
    expect(mockPrisma.notificationPreference.upsert).not.toHaveBeenCalled()
  })
})
