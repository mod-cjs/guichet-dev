/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import {
  CentreEquipeSection,
  type CentreEquipeAgent,
} from '@/components/centres/CentreEquipeSection'

const baseAgent: CentreEquipeAgent = {
  id: 'a1',
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa@cjs.sn',
  telephone: '+221771234567',
  role: 'directeur',
  photoUrl: null,
  domainesExpertise: ['Orientation'],
}

describe('<CentreEquipeSection />', () => {
  it('liste un item par agent avec nom complet et badge rôle traduit', () => {
    render(
      <CentreEquipeSection
        agents={[
          baseAgent,
          { ...baseAgent, id: 'a2', prenom: 'Modou', nom: 'Fall', role: 'conseiller' },
        ]}
      />,
    )
    expect(screen.getByText('Awa Diop')).toBeInTheDocument()
    expect(screen.getByText('Modou Fall')).toBeInTheDocument()
    expect(screen.getByText(/Direction/i)).toBeInTheDocument()
    expect(screen.getByText(/Conseiller/i)).toBeInTheDocument()
  })

  it('affiche un empty state si aucun agent', () => {
    render(<CentreEquipeSection agents={[]} />)
    expect(
      screen.getByText(/Aucun conseiller référencé/i),
    ).toBeInTheDocument()
  })

  it('rend les CTAs tel: et mailto: quand les coordonnées sont fournies', () => {
    render(<CentreEquipeSection agents={[baseAgent]} />)
    const tel = screen.getByRole('link', { name: /Appeler Awa Diop/i })
    const mail = screen.getByRole('link', { name: /Envoyer un email à Awa Diop/i })
    expect(tel).toHaveAttribute('href', 'tel:+221771234567')
    expect(mail).toHaveAttribute('href', 'mailto:awa@cjs.sn')
    expect(tel.getAttribute('style')).toMatch(/min-height:\s*44px/i)
    expect(mail.getAttribute('style')).toMatch(/min-height:\s*44px/i)
  })
})
