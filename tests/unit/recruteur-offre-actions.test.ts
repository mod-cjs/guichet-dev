/**
 * @jest-environment node
 *
 * GUIC-490 (US-8) — Création d'offre par le recruteur.
 * Garanties : garde de rôle fail-closed, statut forcé `brouillon` (→ modération CJS),
 * recruteurUid + organisation verrouillés (anti-spoofing), types restreints Emploi/Stage.
 */
const mockCreate = jest.fn()

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { opportunite: { findUnique: jest.fn() } } }))
jest.mock('@/lib/loaders/recruteur', () => ({ getRecruteurContext: jest.fn() }))
jest.mock('@/lib/services/opportunite-service', () => ({
  // Arrow lazy → `mockCreate` déréférencé au runtime (const déjà initialisée).
  OpportuniteService: jest.fn().mockImplementation(() => ({ create: mockCreate })),
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { getRecruteurContext } from '@/lib/loaders/recruteur'
import { creerOffreRecruteur } from '@/app/recruteur/mes-offres/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockCtx = getRecruteurContext as jest.Mock
const mockPrisma = prisma as unknown as { opportunite: { findUnique: jest.Mock } }

const RECRUTEUR = { cjsUid: 'rec-1', roles: ['recruteur'] }
const CTX = {
  cjsUid: 'rec-1', prenom: 'Fatou', organisationId: 'org-1',
  organisationNom: 'Simplon Sénégal', estVerifie: true, logoUrl: null,
}
const EMPLOI = {
  type: 'emploi', titre: 'Développeur web', description: 'Rejoignez notre équipe.',
  domaine: 'Numerique', region: 'Dakar', typeContrat: 'CDD', dureeContratMois: 12,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.opportunite.findUnique.mockResolvedValue(null) // slug libre
  mockCreate.mockResolvedValue({ id: 'opp-1', statut: 'brouillon' })
  mockCtx.mockResolvedValue(CTX)
})

describe('GUIC-490 — creerOffreRecruteur', () => {
  it('non-recruteur → FORBIDDEN, aucune écriture', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerOffreRecruteur(EMPLOI as any)).rejects.toThrow(/FORBIDDEN/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('force statut=brouillon + recruteurUid + organisation verrouillée + audit', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await creerOffreRecruteur(EMPLOI as any)
    expect(res).toEqual({ id: 'opp-1' })
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const input = mockCreate.mock.calls[0][0]
    expect(input.type).toBe('emploi')
    expect(input.base.statut).toBe('brouillon')
    expect(input.base.recruteurUid).toBe('rec-1')
    expect(input.base.organisationId).toBe('org-1')
    expect(input.base.organisationLibelle).toBe('Simplon Sénégal')
    expect(input.details.typeContrat).toBe('CDD')
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'opportunite.create', expect.any(Object))
  })

  it('GUIC-508 — sanitise la description riche (contenu tiers) avant création', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await creerOffreRecruteur({ ...EMPLOI, description: '<p>Rejoignez-nous</p><script>alert(1)</script>' } as any)
    const desc = mockCreate.mock.calls[0][0].base.description as string
    expect(desc).toContain('<p>Rejoignez-nous</p>')
    expect(desc).not.toMatch(/<script/i)
  })

  it('GUIC-515 — les compétences requises sont transmises au service (base.skills)', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await creerOffreRecruteur({ ...EMPLOI, skills: ['sk-1', 'sk-2'] } as any)
    expect(mockCreate.mock.calls[0][0].base.skills).toEqual([{ skillId: 'sk-1' }, { skillId: 'sk-2' }])
  })

  it('recruteur sans organisation → NO_ORGANISATION', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    mockCtx.mockResolvedValue({ ...CTX, organisationId: null, organisationNom: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerOffreRecruteur(EMPLOI as any)).rejects.toThrow(/NO_ORGANISATION/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('type hors {emploi, stage} → rejet, aucune écriture', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerOffreRecruteur({ ...EMPLOI, type: 'bourse' } as any)).rejects.toThrow()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('titre vide → rejet Zod', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerOffreRecruteur({ ...EMPLOI, titre: '   ' } as any)).rejects.toThrow()
  })

  it('stage sans durée (dureeMois) → rejet Zod', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      creerOffreRecruteur({ type: 'stage', titre: 'Stagiaire QA', description: 'x', domaine: 'Numerique' } as any),
    ).rejects.toThrow()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('stage valide → create appelé avec details.dureeMois', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    await creerOffreRecruteur(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'stage', titre: 'Stagiaire QA', description: 'Mission test', domaine: 'Numerique', dureeMois: 6, indemnise: true } as any,
    )
    const input = mockCreate.mock.calls[0][0]
    expect(input.type).toBe('stage')
    expect(input.details.dureeMois).toBe(6)
    expect(input.details.indemnise).toBe(true)
  })

  it('slug auto-généré depuis le titre (sans accents)', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await creerOffreRecruteur(EMPLOI as any)
    expect(mockCreate.mock.calls[0][0].base.slug).toBe('developpeur-web')
  })
})
