/**
 * GUIC-505 — RichContent : rendu du corps riche + fallback texte plat.
 * Le stockage est du HTML sanitisé (sanitize-html à l'écriture) ; ce composant
 * l'affiche. Les lignes existantes (texte brut, sans balise) retombent sur un
 * rendu `whitespace-pre-line` — jamais de `dangerouslySetInnerHTML` sur du texte plat.
 */
import { render, screen } from '@testing-library/react'
import { RichContent } from '@/components/ui/RichContent'

describe('GUIC-505 — RichContent', () => {
  it('rend le HTML riche (titres, gras, listes)', () => {
    const { container } = render(
      <RichContent html="<h2>Mission</h2><p>Un <strong>rôle</strong> clé</p><ul><li>x</li></ul>" />,
    )
    expect(container.querySelector('h2')).toHaveTextContent('Mission')
    expect(container.querySelector('strong')).toHaveTextContent('rôle')
    expect(container.querySelector('ul li')).toHaveTextContent('x')
  })

  it('affiche le texte plat existant sans balises (fallback)', () => {
    const { container } = render(
      <RichContent html={'Description brute.\nDeuxième ligne.'} />,
    )
    // Pas d'injection HTML : le texte est rendu tel quel dans un bloc pre-line.
    expect(container.querySelector('h2, strong, ul')).toBeNull()
    expect(screen.getByText(/Description brute/)).toBeInTheDocument()
    const block = container.querySelector('[data-plain-text="true"]')
    expect(block).not.toBeNull()
    expect(block?.className).toMatch(/whitespace-pre-line/)
  })

  it('ne rend rien de visible pour une valeur vide', () => {
    const { container } = render(<RichContent html="" />)
    expect(container.textContent).toBe('')
  })

  it('applique la classe prose CJS bridée sur le rendu riche', () => {
    const { container } = render(<RichContent html="<p>ok</p>" />)
    const root = container.querySelector('[data-rich-content="true"]')
    expect(root).not.toBeNull()
    expect(root?.className).toMatch(/gj-prose/)
  })
})
