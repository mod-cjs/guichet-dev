/**
 * GUIC-684 — Le programme de rattachement doit être VISIBLE par le bénéficiaire.
 *
 * Jusqu'ici la donnée était collectée partout (admin, recruteur, conseiller, curation),
 * exposée dans le DTO et dans le Data Hub… et affichée nulle part. Un jeune qui ouvre
 * une opportunité ne pouvait pas savoir de quel programme CJS elle relève.
 */
import { render, screen } from '@testing-library/react'
import { ProgrammeBadges } from '@/components/opportunites/ProgrammeBadges'

describe('ProgrammeBadges', () => {
  it('affiche un badge par programme rattaché', () => {
    render(
      <ProgrammeBadges
        programmes={[
          { slug: 'yeah', nom: 'YEAH' },
          { slug: 'edupop', nom: 'EduPop' },
        ]}
      />,
    )
    expect(screen.getByText('YEAH')).toBeInTheDocument()
    expect(screen.getByText('EduPop')).toBeInTheDocument()
  })

  it('annonce la nature de l’information aux lecteurs d’écran', () => {
    render(<ProgrammeBadges programmes={[{ slug: 'yjc', nom: 'YJC' }]} />)
    expect(screen.getByRole('list', { name: /programme/i })).toBeInTheDocument()
  })

  it('ne rend rien quand aucun programme n’est rattaché (contenu antérieur)', () => {
    const { container } = render(<ProgrammeBadges programmes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
