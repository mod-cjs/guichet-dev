/**
 * @jest-environment node
 *
 * GUIC-581 — Action serveur de persistance des préférences d'accessibilité
 * (page /jeune/accessibilite). Persistance par profil : ProfilJeune.prefsAccessibilite.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { update: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { modifierPrefsAccessibilite } from '@/app/jeune/(app)/accessibilite/actions'

const mockSession = getSession as jest.Mock
const mockPrisma = prisma as unknown as {
  profilJeune: { update: jest.Mock }
}

const JEUNE = { cjsUid: 'jeune-1', roles: ['beneficiaire'] }

const VALID_PREFS = {
  text: 'xl',
  contrast: true,
  gray: false,
  motion: false,
  spacing: true,
  falc: false,
  kbd: false,
  // GUIC-658 — phase 2
  cursor: false,
  guide: true,
  voice: false,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(JEUNE)
  mockPrisma.profilJeune.update.mockResolvedValue({})
})

describe('modifierPrefsAccessibilite', () => {
  it('sans session → UNAUTHORIZED, aucun write', async () => {
    mockSession.mockResolvedValue(null)
    await expect(modifierPrefsAccessibilite(VALID_PREFS)).rejects.toThrow(/UNAUTHORIZED/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('shape valide → update du profil de la session (clé cjs_uid)', async () => {
    await modifierPrefsAccessibilite(VALID_PREFS)
    expect(mockPrisma.profilJeune.update).toHaveBeenCalledWith({
      where: { cjsUid: 'jeune-1' },
      data: { prefsAccessibilite: VALID_PREFS },
    })
  })

  it('clé inconnue injectée → VALIDATION, aucun write', async () => {
    await expect(
      modifierPrefsAccessibilite({ ...VALID_PREFS, role: 'admin' }),
    ).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('taille de texte hors énumération → VALIDATION', async () => {
    await expect(
      modifierPrefsAccessibilite({ ...VALID_PREFS, text: 'géant' }),
    ).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('booléen non-booléen → VALIDATION', async () => {
    await expect(
      modifierPrefsAccessibilite({ ...VALID_PREFS, contrast: 'oui' }),
    ).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  // GUIC-658 — le shape phase 1 (7 clés) n'est plus accepté : la page envoie
  // toujours le shape complet à 10 clés.
  it('shape phase 1 incomplet (sans cursor/guide/voice) → VALIDATION', async () => {
    const { cursor: _c, guide: _g, voice: _v, ...phase1 } = VALID_PREFS
    await expect(modifierPrefsAccessibilite(phase1)).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('voice non-booléen → VALIDATION', async () => {
    await expect(
      modifierPrefsAccessibilite({ ...VALID_PREFS, voice: 'oui' }),
    ).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('guide non-booléen → VALIDATION', async () => {
    await expect(
      modifierPrefsAccessibilite({ ...VALID_PREFS, guide: 1 }),
    ).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('payload non-objet → VALIDATION', async () => {
    await expect(modifierPrefsAccessibilite('hack')).rejects.toThrow(/VALIDATION/)
    await expect(modifierPrefsAccessibilite(null)).rejects.toThrow(/VALIDATION/)
    expect(mockPrisma.profilJeune.update).not.toHaveBeenCalled()
  })

  it('accepte le shape par défaut complet (tout désactivé)', async () => {
    const defaults = {
      text: 'm',
      contrast: false,
      gray: false,
      motion: false,
      spacing: false,
      falc: false,
      kbd: false,
      cursor: false,
      guide: false,
      voice: false,
    }
    await modifierPrefsAccessibilite(defaults)
    expect(mockPrisma.profilJeune.update).toHaveBeenCalledWith({
      where: { cjsUid: 'jeune-1' },
      data: { prefsAccessibilite: defaults },
    })
  })
})
