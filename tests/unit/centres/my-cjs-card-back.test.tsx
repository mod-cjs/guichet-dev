/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MyCJSCardBack } from '@/components/centres/MyCJSCard/MyCJSCardBack'

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE'),
  },
}))

describe('<MyCJSCardBack /> — GUIC-397 fidélité design', () => {
  it('affiche le matricule en monospace', () => {
    render(<MyCJSCardBack matricule="GJS · AD · 23045" />)
    expect(screen.getByText(/GJS · AD · 23045/)).toBeInTheDocument()
  })

  it('reprend le wording design source pour les conditions', () => {
    render(<MyCJSCardBack matricule="GJS · AD · 23045" />)
    // Texte aligné sur design source (cjs-card.jsx) + précisions check-in.
    expect(
      screen.getByText(/Carte nominative.*non transmissible/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/présentation du QR.*vaut consentement au check-in/i),
    ).toBeInTheDocument()
  })

  it('rend le container verso avec padding et border-radius conformes', () => {
    // Note : la propriété `background: linear-gradient(...)` contenant `var()`
    // est strippée par jsdom (parsing CSS partiel). La vérification visuelle
    // du gradient sombre (`var(--gj-ink)` → `#1a2a26`) se fait via Storybook
    // (story `Verso` / `VersoAvecQR`).
    const { container } = render(<MyCJSCardBack matricule="GJS · AD · 23045" />)
    const article = container.querySelector(
      'article[aria-label="Verso carte CJS"]',
    ) as HTMLElement
    expect(article).not.toBeNull()
    const styleAttr = article.getAttribute('style') ?? ''
    expect(styleAttr).toContain('border-radius: 18px')
    expect(styleAttr).toContain('padding: 22px')
  })

  it('barcode décoratif : largeurs variables (au moins 3 valeurs distinctes parmi {1,2,3})', () => {
    render(<MyCJSCardBack matricule="GJS · AD · 23045" />)
    const barcode = screen.getByTestId('cjs-card-back-barcode')
    const bars = Array.from(barcode.querySelectorAll('span'))
    expect(bars.length).toBeGreaterThan(0)
    const widths = new Set(
      bars.map((b) => {
        const style = b.getAttribute('style') ?? ''
        const m = style.match(/width:\s*(\d+)px/)
        return m ? m[1] : null
      }),
    )
    // 3 valeurs distinctes attendues (1, 2, 3 px).
    expect(widths.has('1')).toBe(true)
    expect(widths.has('2')).toBe(true)
    expect(widths.has('3')).toBe(true)
  })

  it('barcode : pas d\'alternance jaune (couleur uniforme blanc — GUIC-397)', () => {
    // Note : jsdom strip `background: var(--gj-surface)` du style inline. On
    // valide donc *l\'absence* du token `--gj-yellow` (régression visée :
    // suppression de l\'alternance jaune/blanc du livré initial).
    render(<MyCJSCardBack matricule="GJS · AD · 23045" />)
    const barcode = screen.getByTestId('cjs-card-back-barcode')
    const bars = Array.from(barcode.querySelectorAll('span'))
    expect(bars.length).toBeGreaterThan(0)
    for (const b of bars) {
      const style = (b.getAttribute('style') ?? '').toLowerCase()
      expect(style).not.toContain('--gj-yellow')
      // Vérifie aussi qu\'on n\'a plus l\'opacity .6 (autre marqueur du livré initial).
      expect(style).not.toContain('opacity')
    }
  })

  it('si qrToken fourni, affiche le QR au lieu du barcode', () => {
    render(<MyCJSCardBack matricule="GJS · AD · 23045" qrToken="jwt-demo" />)
    expect(screen.getByTestId('cjs-card-back-qr')).toBeInTheDocument()
    expect(screen.queryByTestId('cjs-card-back-barcode')).toBeNull()
  })
})
