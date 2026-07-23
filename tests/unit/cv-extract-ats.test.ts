/**
 * @jest-environment node
 *
 * ATS (GUIC-487 évolution) — extraction du texte du CV PDF + injection dans le
 * prompt d'adéquation : le scoring analyse le contenu réel du CV, pas
 * seulement le profil déclaré.
 */
const mockLire = jest.fn()
jest.mock('@/lib/storage', () => ({
  stockagePour: () => ({ lire: (...a: unknown[]) => mockLire(...a) }),
}))
const mockPdfParse = jest.fn()
jest.mock('pdf-parse', () => ({ __esModule: true, default: (...a: unknown[]) => mockPdfParse(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('@/lib/prisma', () => ({ prisma: {} }))

import { extraireTexteCv } from '@/lib/recruteur/cv-extract'
import { buildAdequationMessages } from '@/lib/recruteur/adequation'

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLire.mockResolvedValue({ corps: streamOf(new Uint8Array([1, 2])), contentType: 'application/pdf' })
  mockPdfParse.mockResolvedValue({ text: 'Expérience :  développeur   agricole\n2 ans chez AgriCorp' })
})

describe('extraireTexteCv', () => {
  it('télécharge le PDF, extrait et normalise le texte', async () => {
    const texte = await extraireTexteCv('blob://cv/c1.pdf')
    expect(texte).toBe('Expérience : développeur agricole 2 ans chez AgriCorp')
  })

  it('tronque à 6000 caractères', async () => {
    mockPdfParse.mockResolvedValue({ text: 'x'.repeat(9000) })
    const texte = await extraireTexteCv('blob://cv/c1.pdf')
    expect(texte).toHaveLength(6000)
  })

  it('contenu non-PDF → null', async () => {
    mockLire.mockResolvedValue({ corps: streamOf(new Uint8Array()), contentType: 'image/png' })
    expect(await extraireTexteCv('blob://cv/c1.png')).toBeNull()
  })

  it('cvUrl absent → null sans lecture', async () => {
    expect(await extraireTexteCv(null)).toBeNull()
    expect(mockLire).not.toHaveBeenCalled()
  })

  it('fail-soft : erreur de stockage → null', async () => {
    mockLire.mockRejectedValue(new Error('objet introuvable'))
    expect(await extraireTexteCv('blob://cv/c1.pdf')).toBeNull()
  })
})

describe('buildAdequationMessages — CV dans le prompt', () => {
  const base = {
    offre: { titre: 'Stage agro', description: '<p>desc</p>', niveauEtudeMin: null, skills: ['Python'] },
    candidat: { niveauEtude: 'Licence', competences: ['Excel'], lettreMotivation: null },
  }

  it('inclut l’extrait du CV quand il est présent', () => {
    const { system, user } = buildAdequationMessages({
      ...base,
      candidat: { ...base.candidat, cvTexte: 'Développeur 2 ans chez AgriCorp' },
    })
    expect(user).toContain('EXTRAIT DU CV')
    expect(user).toContain('Développeur 2 ans chez AgriCorp')
    expect(system).toMatch(/CV.*PRIME/i)
  })

  it('sans CV, le prompt reste au format profil seul', () => {
    const { user } = buildAdequationMessages(base)
    expect(user).not.toContain('EXTRAIT DU CV')
  })
})
