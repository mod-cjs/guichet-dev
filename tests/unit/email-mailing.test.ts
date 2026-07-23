/**
 * @jest-environment node
 *
 * Tests de l'envoi groupé du pipeline recruteur (GUIC-553 évolution).
 */
const mockCandFind = jest.fn()
const mockEnvoiCreate = jest.fn()
const mockTplFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: { findMany: (...a: unknown[]) => mockCandFind(...a) },
    notificationEnvoi: { create: (...a: unknown[]) => mockEnvoiCreate(...a) },
    emailTemplate: { findMany: (...a: unknown[]) => mockTplFind(...a) },
  },
}))
const mockSend = jest.fn()
jest.mock('@/lib/email/resend', () => ({ sendResendEmail: (...a: unknown[]) => mockSend(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { envoyerMailingCandidatures } from '@/lib/email/mailing'

const CAND = {
  id: 'c1',
  cjsUid: 'j1',
  utilisateur: { prenom: 'Awa', nom: 'Diallo', email: 'awa@x.sn' },
  opportunite: { titre: 'Stage agro', org: { nom: 'AgriCorp' } },
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NOTIFICATIONS_ENABLED = 'true'
  mockTplFind.mockResolvedValue([])
  mockCandFind.mockResolvedValue([CAND])
  mockEnvoiCreate.mockResolvedValue({ id: 'e1' })
  mockSend.mockResolvedValue(undefined)
})

describe('envoyerMailingCandidatures', () => {
  it('rend le template (variables + complément) et envoie via Resend', async () => {
    const res = await envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.retenue', 'Prise de poste lundi.')
    expect(res).toEqual({ envoyes: 1, sansEmail: 0, echecs: 0 })
    const [to, sujet, html, texte] = mockSend.mock.calls[0]
    expect(to).toBe('awa@x.sn')
    expect(sujet).toContain('Stage agro')
    expect(texte).toContain('Awa')
    expect(texte).toContain('Prise de poste lundi.')
    // Habillage CJS email-safe : bandeau + contenu riche du template par défaut.
    expect(html).toContain('Guichet Jeunesse')
    expect(html).toContain('<strong>Awa</strong>')
  })

  it('échappe le complément libre injecté dans un template HTML', async () => {
    await envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.retenue', '<script>alert(1)</script>')
    const html = mockSend.mock.calls[0][2]
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('utilise la version personnalisée du recruteur si elle existe', async () => {
    mockTplFind.mockResolvedValue([
      { cle: 'pipeline.retenue', ownerUid: 'rec-1', sujet: 'Bienvenue {{prenom}} !', corps: 'On t’attend {{prenom}}.' },
    ])
    await envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.retenue')
    expect(mockSend.mock.calls[0][1]).toBe('Bienvenue Awa !')
  })

  it('candidat sans email → compté sansEmail, aucun envoi', async () => {
    mockCandFind.mockResolvedValue([{ ...CAND, utilisateur: { ...CAND.utilisateur, email: null } }])
    const res = await envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.refus')
    expect(res).toEqual({ envoyes: 0, sansEmail: 1, echecs: 0 })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('échec Resend → compté echecs, tracé abandonnee, les autres continuent', async () => {
    mockCandFind.mockResolvedValue([CAND, { ...CAND, id: 'c2', utilisateur: { ...CAND.utilisateur, email: 'b@x.sn' } }])
    mockSend.mockRejectedValueOnce(new Error('422')).mockResolvedValueOnce(undefined)
    const res = await envoyerMailingCandidatures('rec-1', ['c1', 'c2'], 'pipeline.refus')
    expect(res).toEqual({ envoyes: 1, sansEmail: 0, echecs: 1 })
    expect(mockEnvoiCreate.mock.calls[0][0].data.statut).toBe('abandonnee')
    expect(mockEnvoiCreate.mock.calls[1][0].data.statut).toBe('envoyee')
  })

  it('trace chaque envoi dans l’historique avec la clé du template', async () => {
    await envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.entretien')
    expect(mockEnvoiCreate.mock.calls[0][0].data).toMatchObject({
      eventKey: 'recruteur.mailing.pipeline.entretien',
      canal: 'email',
      cjsUid: 'j1',
      valideePar: 'rec-1',
    })
  })

  it('NOTIFICATIONS_ENABLED absent → NOTIFICATIONS_DISABLED', async () => {
    delete process.env.NOTIFICATIONS_ENABLED
    await expect(envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.refus')).rejects.toThrow(/NOTIFICATIONS_DISABLED/)
  })

  it('template inconnu → erreur explicite', async () => {
    await expect(envoyerMailingCandidatures('rec-1', ['c1'], 'pipeline.zzz')).rejects.toThrow(/TEMPLATE_INCONNU/)
  })
})
