/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MaCarteBeneficesSection } from '@/components/centres/MaCarteBeneficesSection'

describe('<MaCarteBeneficesSection /> — GUIC-398', () => {
  it('rend les 4 bénéfices canoniques par défaut', () => {
    render(<MaCarteBeneficesSection />)
    expect(screen.getByText('Accès')).toBeInTheDocument()
    expect(screen.getByText('Check-in')).toBeInTheDocument()
    expect(screen.getByText('Retrait')).toBeInTheDocument()
    expect(screen.getByText('Hors-ligne')).toBeInTheDocument()
  })

  it('rend le titre de section "À quoi sert ta carte"', () => {
    render(<MaCarteBeneficesSection />)
    expect(
      screen.getByRole('heading', { name: /À quoi sert ta carte/i }),
    ).toBeInTheDocument()
  })

  it('accepte une liste personnalisée', () => {
    render(
      <MaCarteBeneficesSection
        benefices={[
          { titre: 'Custom', description: 'desc', icon: 'pin' },
        ]}
      />,
    )
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.queryByText('Accès')).not.toBeInTheDocument()
  })

  it('expose `data-testid="ma-carte-benefices"` pour les tests d\'intégration', () => {
    render(<MaCarteBeneficesSection />)
    expect(screen.getByTestId('ma-carte-benefices')).toBeInTheDocument()
  })
})
