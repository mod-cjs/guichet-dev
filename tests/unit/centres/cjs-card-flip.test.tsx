/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CJSCardFlip } from '@/components/centres/CJSCardFlip'

// QRBadge fait du QR generation async via la lib `qrcode`, on mocke pour tests.
jest.mock(
  'qrcode',
  () => ({
    __esModule: true,
    default: {
      toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,AA'),
    },
  }),
  // GUIC-617 — pas de `{ virtual: true }` : `qrcode` est installé, et `virtual` sur un module
  // réel empoisonne le résolveur des fichiers suivants (cf. ma-carte-page.test.tsx).
)

const baseUser = {
  prenom: 'Aminata',
  nom: 'Diop',
  matricule: 'GJS · AD · 23045',
  membreDepuis: '03/2025',
  centrePrincipal: { nom: 'CJS Dakar', region: 'Dakar' },
}

describe('<CJSCardFlip />', () => {
  it('flip au clic : aria-pressed bascule false → true', () => {
    render(<CJSCardFlip user={baseUser} cjsUid="u-1" />)
    const btn = screen.getByRole('button', { name: /Voir le dos/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    // aria-label change pour annoncer l'état
    expect(btn.getAttribute('aria-label')).toMatch(/recto/i)
  })

  it('ARIA : role button + aria-pressed sur le wrapper de flip', () => {
    render(<CJSCardFlip user={baseUser} cjsUid="u-1" />)
    const btn = screen.getByTestId('cjs-card-flip-inner')
    expect(btn.getAttribute('role')).toBe('button')
    expect(btn.getAttribute('tabindex')).toBe('0')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('prefers-reduced-motion : style de transition désactivé via media query (style block présent)', () => {
    const { container } = render(<CJSCardFlip user={baseUser} cjsUid="u-1" />)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toMatch(/prefers-reduced-motion/)
    expect(styleTag?.textContent).toMatch(/transition:\s*none/)
  })

  it('clavier : Enter et Space déclenchent le flip', () => {
    render(<CJSCardFlip user={baseUser} cjsUid="u-1" />)
    const btn = screen.getByTestId('cjs-card-flip-inner')
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(btn, { key: ' ' })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })
})
