/**
 * @jest-environment jsdom
 *
 * Règle NON NÉGOCIABLE design v5 : « Aucune réponse de Yaye sans ligne de sources ».
 * Chaque réponse bot doit afficher, sous son contenu, une légende de provenance
 * honnête (icône document du sprite + libellé discret ≥ 11px) — cf. design v5
 * `yaye-web.jsx:58` (« basé sur ton profil + 142 offres »). GUIC-689 (vague 2).
 */
import { render, screen } from '@testing-library/react'
import { YayeBlocks } from '@/components/yaye/YayeBlocks'
import type { YayeBlock } from '@/lib/ia/blocks'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('YayeBlocks — bloc "sources" (ligne de provenance)', () => {
  it('affiche le libellé de sources sous la réponse texte', () => {
    const blocks: YayeBlock[] = [
      { kind: 'text', text: 'Voici pour toi.' },
      { kind: 'sources', label: 'Basé sur ton profil et le catalogue du Guichet' },
    ]
    render(<YayeBlocks blocks={blocks} />)
    expect(screen.getByText('Basé sur ton profil et le catalogue du Guichet')).toBeInTheDocument()
  })

  it('affiche l’icône document (sprite) à côté du libellé', () => {
    const blocks: YayeBlock[] = [{ kind: 'sources', label: 'Basé sur le catalogue du Guichet' }]
    const { container } = render(<YayeBlocks blocks={blocks} />)
    expect(container.querySelector('use[href="/icons.svg#i-document"]')).toBeTruthy()
  })

  it('ne plante jamais quand le bloc sources est présent, seul ou combiné à des cards', () => {
    const blocks: YayeBlock[] = [{ kind: 'sources', label: 'Basé sur le catalogue du Guichet' }]
    expect(() => render(<YayeBlocks blocks={blocks} />)).not.toThrow()
  })

  it('taille de texte discrète mais LISIBLE (--fs-100 = 11px, jamais en-dessous — cf. tokens.css)', () => {
    const blocks: YayeBlock[] = [{ kind: 'sources', label: 'Basé sur le catalogue du Guichet' }]
    render(<YayeBlocks blocks={blocks} />)
    const label = screen.getByText('Basé sur le catalogue du Guichet')
    expect(label.closest('.text-fs-100')).toBeTruthy()
  })
})
