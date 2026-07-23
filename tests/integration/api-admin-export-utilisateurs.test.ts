/**
 * @jest-environment node
 *
 * Tests `GET /api/admin/export/utilisateurs` — export CSV PII session-gated (C3)
 * + journalisation CDP de l'accès (E1).
 */

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockAudit = jest.fn()
jest.mock('@/lib/audit', () => ({
  auditPiiAccess: (...a: unknown[]) => mockAudit(...a),
}))

jest.mock('@/lib/regions', () => ({
  regionLabel: (v: string | null) => (v === 'Dakar' ? 'Dakar' : v),
}))

const mockUserFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findMany: (...a: unknown[]) => mockUserFindMany(...a) },
  },
}))

import { GET } from '@/app/api/admin/export/utilisateurs/route'

beforeEach(() => {
  jest.clearAllMocks()
  mockUserFindMany.mockResolvedValue([])
})

describe('GET /api/admin/export/utilisateurs', () => {
  it('refuse 403 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(403)
    expect(mockAudit).not.toHaveBeenCalled()
  })

  it('refuse 403 si rôle non-admin', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['jeune'] })
    const res = await GET()
    expect(res.status).toBe(403)
    expect(mockAudit).not.toHaveBeenCalled()
  })

  it('accepte moderator (garde unifiée isAdminRole)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['moderator'] })
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('retourne 200 + CSV + journalise l’accès PII (acteur + volume)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'admin-9', roles: ['admin'] })
    mockUserFindMany.mockResolvedValue([
      {
        prenom: 'Awa',
        nom: 'Diop',
        email: 'awa@example.sn',
        telephone: '+221770000000',
        region: 'Dakar',
        commune: 'Plateau',
        statut: 'actif',
        createdAt: new Date('2026-01-15T00:00:00Z'),
        // GUIC-660 — colonnes inclusion (valeurs enum → libellés FR)
        profil: { zoneHabitation: 'urbain', situationHandicap: 'moteur' },
      },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('utilisateurs-')

    const body = await res.text()
    expect(body).toContain("Prénom,Nom,Email,Téléphone,Région,Commune,Zone d'habitation,Situation de handicap,Statut,Inscrit le")
    expect(body).toContain('Awa,Diop,awa@example.sn,+221770000000,Dakar,Plateau,Urbain,Moteur,actif,2026-01-15')

    // E1 — un seul appel d'audit, marqueur export.utilisateurs, acteur + count.
    expect(mockAudit).toHaveBeenCalledTimes(1)
    expect(mockAudit).toHaveBeenCalledWith('export.utilisateurs', 'admin-9', { count: 1 })
  })
})
