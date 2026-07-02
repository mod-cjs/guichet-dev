/**
 * @jest-environment node
 *
 * GUIC-476 — Audit CDP des téléchargements de documents personnels sensibles.
 * Vérifie que les routes de fichiers privés journalisent l'accès (qui/quoi) via
 * auditPiiAccess, et que le stream se fait MÊME si l'audit échoue (fail-soft).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('@/lib/audit', () => ({ auditPiiAccess: jest.fn() }))
jest.mock('@/app/api/profil/photo/file/route', () => ({ proxyPrivateBlob: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { findUnique: jest.fn() },
    diplome: { findFirst: jest.fn() },
  },
}))

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { auditPiiAccess } from '@/lib/audit'
import { proxyPrivateBlob } from '@/app/api/profil/photo/file/route'
import { prisma } from '@/lib/prisma'
import { GET as getCv } from '@/app/api/profil/cv/file/route'
import { GET as getDiplome } from '@/app/api/profil/diplomes/[id]/file/route'

const mockSession = getSession as jest.Mock
const mockRate = rateLimit as jest.Mock
const mockAudit = auditPiiAccess as jest.Mock
const mockProxy = proxyPrivateBlob as jest.Mock
const mockPrisma = prisma as unknown as {
  profilJeune: { findUnique: jest.Mock }
  diplome: { findFirst: jest.Mock }
}

const SENTINEL = { streamed: true }

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue({ cjsUid: 'jeune-1', roles: ['beneficiaire'] })
  mockRate.mockResolvedValue(null)
  mockProxy.mockResolvedValue(SENTINEL)
  mockPrisma.profilJeune.findUnique.mockResolvedValue({ cvUrl: 'blob://cv' })
  mockPrisma.diplome.findFirst.mockResolvedValue({ fichierUrl: 'blob://dip' })
  mockAudit.mockResolvedValue(undefined)
})

const req = () => new NextRequest('http://localhost/api/profil/cv/file')

describe('GUIC-476 — audit download CV', () => {
  it('journalise ressource_sensible.download avec docType=cv puis stream', async () => {
    const res = await getCv(req())
    expect(mockAudit).toHaveBeenCalledWith('ressource_sensible.download', 'jeune-1', {
      targetCjsUid: 'jeune-1',
      meta: { docType: 'cv' },
    })
    expect(res).toBe(SENTINEL)
  })

  it('fail-soft : si l\'audit throw, le CV est quand même streamé', async () => {
    mockAudit.mockRejectedValue(new Error('audit down'))
    const res = await getCv(req())
    expect(res).toBe(SENTINEL)
  })

  it('sans session, renvoie 401 et n\'audite pas', async () => {
    mockSession.mockResolvedValue(null)
    const res = await getCv(req())
    expect(res.status).toBe(401)
    expect(mockAudit).not.toHaveBeenCalled()
  })
})

describe('GUIC-476 — audit download diplôme', () => {
  it('journalise docType=diplome + docId', async () => {
    const res = await getDiplome(req(), { params: Promise.resolve({ id: 'dip-9' }) })
    expect(mockAudit).toHaveBeenCalledWith('ressource_sensible.download', 'jeune-1', {
      targetCjsUid: 'jeune-1',
      meta: { docType: 'diplome', docId: 'dip-9' },
    })
    expect(res).toBe(SENTINEL)
  })
})
