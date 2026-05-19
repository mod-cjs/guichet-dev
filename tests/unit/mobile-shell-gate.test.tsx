/**
 * Tests unitaires de MobileShellGate — filtre client qui décide si
 * AppTopbar / BottomNav doivent être rendus selon le pathname.
 */

import { render } from '@testing-library/react'

const mockUsePathname = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MobileShellGate } = require('@/components/layout/MobileAppShell/MobileShellGate')

function renderGate(pathname: string) {
  mockUsePathname.mockReturnValue(pathname)
  return render(<MobileShellGate><div data-testid="child">SHELL</div></MobileShellGate>)
}

describe('MobileShellGate', () => {
  describe('routes exclues — ne rend pas le shell', () => {
    it.each([
      '/admin',
      '/admin/tableau-de-bord',
      '/recruteur',
      '/recruteur/candidatures',
      '/jeune/onboarding',
      '/auth',
      '/auth/connexion',
      '/auth/callback',
    ])('exclut %s', (path) => {
      const { queryByTestId } = renderGate(path)
      expect(queryByTestId('child')).toBeNull()
    })
  })

  describe('routes autorisées — rend le shell', () => {
    it.each([
      '/',
      '/opportunites',
      '/opportunites/abc-123',
      '/evenements',
      '/ressources',
      '/centres',
      '/jeune/tableau-de-bord',
      '/jeune/mon-profil',
    ])('rend %s', (path) => {
      const { getByTestId } = renderGate(path)
      expect(getByTestId('child').textContent).toBe('SHELL')
    })
  })

  describe('frontières exactes', () => {
    it("ne confond pas /jeune/onboarding avec /jeune/onboard-other", () => {
      const { getByTestId } = renderGate('/jeune/onboard-other')
      expect(getByTestId('child')).toBeTruthy()
    })

    it("exclut /jeune/onboarding/step-2 (sous-route du funnel)", () => {
      const { queryByTestId } = renderGate('/jeune/onboarding/step-2')
      expect(queryByTestId('child')).toBeNull()
    })

    it("rend la racine /authxyz (n'est pas une route auth)", () => {
      const { getByTestId } = renderGate('/authxyz')
      expect(getByTestId('child')).toBeTruthy()
    })
  })
})
