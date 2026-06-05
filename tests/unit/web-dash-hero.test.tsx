import { render, screen } from '@testing-library/react'
import { WebDashHero } from '@/components/dashboard/WebDashHero'

describe('<WebDashHero />', () => {
  it('affiche la salutation avec le prénom', () => {
    render(<WebDashHero prenom="Awa" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Awa/i)
  })

  it('utilise un fallback quand le prénom est vide', () => {
    render(<WebDashHero prenom="" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/à toi/i)
  })

  it('mentionne le nombre de candidatures en cours quand > 0', () => {
    render(
      <WebDashHero
        prenom="Awa"
        candidaturesEnCours={3}
        oppsRecommandees={8}
        joursAvantCloture={3}
      />,
    )
    expect(screen.getByText(/3 candidatures en cours/i)).toBeInTheDocument()
    expect(screen.getByText(/8 opportunités/i)).toBeInTheDocument()
    expect(screen.getByText(/3 jours/i)).toBeInTheDocument()
  })

  it('affiche le message de découverte quand aucune candidature', () => {
    render(<WebDashHero prenom="Awa" candidaturesEnCours={0} />)
    expect(screen.getByText(/Découvre les/i)).toBeInTheDocument()
  })

  it('rend les CTA Explorer et Yaye', () => {
    render(<WebDashHero prenom="Awa" />)
    expect(screen.getByRole('link', { name: /Explorer les opportunités/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Yaye, dis-moi comment continuer/i })).toBeInTheDocument()
  })
})
