/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { CentreCard, type CentreCardData } from './index'

const base: CentreCardData = {
  id: 'c1', nom: 'CJS Dakar', region: 'Dakar', estActif: true,
  staff: 8, jeunes: 8940, insertion: 42, ouvert: true, fermeA: '17:00',
  services: ['WiFi', 'Bibliotheque', 'Coworking', 'Ateliers', 'Conseiller'],
}

describe('CentreCard (fidélité maquette : 3 stats + footer)', () => {
  it('affiche nom, région, badge Actif et les 3 stats Staff/Jeunes/Insertion', () => {
    render(<CentreCard centre={base} />)
    expect(screen.getByText('CJS Dakar')).toBeInTheDocument()
    expect(screen.getByText('Dakar')).toBeInTheDocument()
    expect(screen.getByText(/^Actif$/)).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()       // staff
    expect(screen.getByText('8 940')).toBeInTheDocument()   // jeunes
    expect(screen.getByText('42%')).toBeInTheDocument()     // insertion
    expect(screen.getByText(/Staff/i)).toBeInTheDocument()
    expect(screen.getByText(/Insertion/i)).toBeInTheDocument()
  })

  it('footer : statut d’ouverture + services (max 3 + compteur)', () => {
    render(<CentreCard centre={base} />)
    expect(screen.getByText(/Ouvert · ferme 17:00/)).toBeInTheDocument()
    expect(screen.getByText('WiFi')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument() // 5 services → 3 affichés + « +2 »
  })

  it('fermé : statut Fermé', () => {
    render(<CentreCard centre={{ ...base, ouvert: false, fermeA: null }} />)
    expect(screen.getByText(/^Fermé$/)).toBeInTheDocument()
  })

  it('inactif : badge Inactif', () => {
    render(<CentreCard centre={{ ...base, estActif: false }} />)
    expect(screen.getByText(/^Inactif$/)).toBeInTheDocument()
  })

  it('toute la carte ouvre la fiche du centre', () => {
    render(<CentreCard centre={base} />)
    expect(screen.getByRole('link', { name: /fiche de/i })).toHaveAttribute('href', '/admin/centres/c1')
  })

  it('applique la couleur de région via --cc (rgb, pas de hex en dur)', () => {
    const { container } = render(<CentreCard centre={base} />)
    const root = container.querySelector('a') as HTMLElement
    expect(root.style.getPropertyValue('--cc')).toMatch(/^\d+,\d+,\d+$/)
  })
})
