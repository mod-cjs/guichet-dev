import { render, screen } from '@testing-library/react'
import { Alert } from '@/components/ui/Alert'

/**
 * GUIC-689 — Lot C2.1 : les icônes d'Alert doivent venir du sprite SVG
 * (`<Icon />`), jamais de glyphe texte brut (`i`, `✓`, `!`, `✕`).
 */
describe('<Alert />', () => {
  it.each([
    ['info', 'i-info', 'Information'],
    ['success', 'i-check-circle', 'Succès'],
    ['warning', 'i-alert', 'Avertissement'],
    ['error', 'i-close', 'Erreur'],
  ] as const)('type=%s utilise l’icône sprite %s', (type, spriteId, label) => {
    const { container } = render(<Alert type={type}>Contenu</Alert>)
    const use = container.querySelector('use')
    expect(use).not.toBeNull()
    expect(use!.getAttribute('href')).toBe(`/icons.svg#${spriteId}`)
    expect(screen.getByTitle(label)).toBeInTheDocument()
  })

  it('ne rend plus aucun glyphe texte brut comme icône', () => {
    const { container } = render(<Alert type="error">Erreur</Alert>)
    expect(container.textContent).not.toMatch(/[✕✓!]/)
    // le seul "i" attendu est dans le texte du children éventuel, jamais isolé
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
