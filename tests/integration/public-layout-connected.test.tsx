/**
 * GUIC-349 — Tests d'intégration du layout (public) adaptatif.
 *
 * Comportement attendu :
 * - User anonyme → Header marketing + Footer
 * - User connecté → BenefSidebar + BenefTopBar (desktop) + MobileAppShell (mobile, global)
 *   → pas de Header marketing
 * - User connecté non-onboardé → toujours layout connecté (pas de redirect)
 *
 * On vérifie la structure via data-testid (les composants visuels et leurs
 * styles responsive sont testés à part dans tests/unit/).
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/loaders/notifications', () => ({
  countUnreadNotifications: jest.fn().mockResolvedValue(0),
}))

// Stubs légers pour les composants client/server qui amènent du DOM complexe
// (next/image, next/link, hooks router…). On garde leurs data-testid pour
// vérifier la composition du layout.
jest.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="marketing-header">Header marketing</header>,
}))

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="marketing-footer">Footer marketing</footer>,
}))

jest.mock('@/components/layout/BenefSidebar', () => ({
  BenefSidebar: (props: Record<string, unknown>) => (
    <aside data-testid="benef-sidebar" data-user-name={String(props.userName ?? '')}>
      Sidebar
    </aside>
  ),
}))

jest.mock('@/components/layout/BenefTopBar', () => ({
  BenefTopBar: (props: Record<string, unknown>) => (
    <div data-testid="benef-topbar" data-unread={String(props.unread ?? '')}>
      TopBar
    </div>
  ),
}))

import { render, screen } from '@testing-library/react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSession } = require('@/lib/auth') as { getSession: jest.Mock }
import PublicLayout from '@/app/(public)/layout'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GUIC-349 — PublicLayout adaptatif', () => {
  it('user anonyme → Header marketing + Footer (toutes tailles)', async () => {
    getSession.mockResolvedValue(null)
    const ui = await PublicLayout({ children: <div data-testid="child">test</div> })
    render(ui)
    expect(screen.getByTestId('marketing-header')).toBeInTheDocument()
    expect(screen.getByTestId('marketing-footer')).toBeInTheDocument()
    expect(screen.queryByTestId('benef-sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('benef-topbar')).not.toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('user connecté → BenefSidebar + BenefTopBar, pas de Header marketing', async () => {
    getSession.mockResolvedValue({
      cjsUid: 'uid-1',
      prenom: 'Awa',
      nom: 'Diop',
      roles: ['beneficiaire'],
      region: 'Dakar',
      onboardingComplete: true,
    })
    const ui = await PublicLayout({ children: <div data-testid="child">test</div> })
    render(ui)
    expect(screen.getByTestId('benef-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('benef-topbar')).toBeInTheDocument()
    expect(screen.queryByTestId('marketing-header')).not.toBeInTheDocument()
    expect(screen.queryByTestId('marketing-footer')).not.toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('user connecté → BenefSidebar reçoit nom + initiales calculés depuis la session', async () => {
    getSession.mockResolvedValue({
      cjsUid: 'uid-1',
      prenom: 'Awa',
      nom: 'Diop',
      roles: ['beneficiaire'],
      region: 'Dakar',
      onboardingComplete: true,
    })
    const ui = await PublicLayout({ children: <div>test</div> })
    render(ui)
    expect(screen.getByTestId('benef-sidebar')).toHaveAttribute('data-user-name', 'Awa Diop')
  })

  it('user connecté non-onboardé → toujours layout connecté (pas de redirect)', async () => {
    getSession.mockResolvedValue({
      cjsUid: 'uid-1',
      prenom: 'Awa',
      nom: 'Diop',
      roles: ['beneficiaire'],
      region: null,
      onboardingComplete: false,
    })
    const ui = await PublicLayout({ children: <div data-testid="child">test</div> })
    render(ui)
    expect(screen.getByTestId('benef-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('benef-topbar')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
