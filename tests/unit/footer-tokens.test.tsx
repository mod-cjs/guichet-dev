/**
 * GUIC-689 — Footer marketing : hygiène tokens (design v5).
 * `--gj-ink-teal` = « footers, sidebars back-office » (tokens.css) — navy
 * charte, pas `--gj-ink` (noir charte).
 */
import { render } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'

describe('<Footer /> — tokens v5', () => {
  it('porte bg-gj-ink-teal (pas bg-gj-ink)', () => {
    const { container } = render(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(footer?.className).toMatch(/\bbg-gj-ink-teal\b/)
    expect(footer?.className).not.toMatch(/bg-gj-ink(?!-teal)\b/)
  })
})
