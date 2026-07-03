/**
 * @jest-environment node
 *
 * GUIC-506 (Phase C) — Sanitisation des corps riches sur les extensions :
 * partenaire, profil entreprise recruteur, ressource de centre.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

const orgUpdate = jest.fn().mockResolvedValue({ id: 'org-1' })
const orgFindFirst = jest.fn().mockResolvedValue({ id: 'org-1' })
const rcCreate = jest.fn().mockResolvedValue({ id: 'rc-1', centreId: 'c1' })
const centreFindUnique = jest.fn().mockResolvedValue({ id: 'c1' })
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: {
      update: (...a: unknown[]) => orgUpdate(...a),
      findFirst: (...a: unknown[]) => orgFindFirst(...a),
    },
    ressourceCentre: { create: (...a: unknown[]) => rcCreate(...a) },
    centre: { findUnique: (...a: unknown[]) => centreFindUnique(...a) },
  },
}))

import { getSession } from '@/lib/auth'
import { modifierPartenaire } from '@/app/admin/partenaires/actions'
import { modifierProfilEntreprise } from '@/app/recruteur/profil-entreprise/actions'
import { creerRessourceCentre } from '@/app/admin/centres/ressources-actions'

const mockSession = getSession as jest.Mock
beforeEach(() => jest.clearAllMocks())

describe('GUIC-506 — modifierPartenaire sanitise la présentation', () => {
  it('retire le script', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin-1', roles: ['admin'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await modifierPartenaire('org-1', { nom: 'ACME', description: '<p>Bonjour</p><script>x</script>', email: '' } as any)
    const data = orgUpdate.mock.calls[0][0].data
    expect(data.description).toContain('<p>Bonjour</p>')
    expect(data.description).not.toMatch(/<script/i)
  })
})

describe('GUIC-506 — modifierProfilEntreprise sanitise la description (contenu tiers)', () => {
  it('retire le handler on* et normalise le vide en null', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'rec-1', roles: ['recruteur'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await modifierProfilEntreprise({ description: '<p>Ok</p><img src="https://x.sn/a.png" onerror="x">' } as any)
    let data = orgUpdate.mock.calls[0][0].data
    expect(data.description).toContain('<p>Ok</p>')
    expect(data.description).not.toMatch(/onerror/i)

    orgUpdate.mockClear()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await modifierProfilEntreprise({ description: '<p></p>' } as any)
    data = orgUpdate.mock.calls[0][0].data
    expect(data.description).toBeNull()
  })
})

describe('GUIC-506 — creerRessourceCentre sanitise la description', () => {
  it('retire le script', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin-1', roles: ['admin'] })
    await creerRessourceCentre('c1', {
      type: 'Salle', nom: 'Salle A', description: '<p>Grande salle</p><script>x</script>',
      capacite: 20, dureeMinCreneauMin: 60,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const data = rcCreate.mock.calls[0][0].data
    expect(data.description).toContain('<p>Grande salle</p>')
    expect(data.description).not.toMatch(/<script/i)
  })
})
