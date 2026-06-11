/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import {
  CentreServicesGrid,
  formatServiceLabel,
} from '@/components/centres/CentreServicesGrid'

describe('<CentreServicesGrid />', () => {
  it('rend une chip par service', () => {
    render(
      <CentreServicesGrid
        services={['WiFi', 'Bibliotheque', 'Salle_reunion']}
      />,
    )
    expect(screen.getByText('Wi-Fi')).toBeInTheDocument()
    expect(screen.getByText('Bibliothèque')).toBeInTheDocument()
    expect(screen.getByText('Salle de réunion')).toBeInTheDocument()
  })

  it('formate les labels enum en chaînes lisibles', () => {
    expect(formatServiceLabel('WiFi')).toBe('Wi-Fi')
    expect(formatServiceLabel('Salle_reunion')).toBe('Salle de réunion')
    expect(formatServiceLabel('Postes_info')).toBe('Postes informatiques')
    expect(formatServiceLabel('Inconnu_X')).toBe('Inconnu X')
  })

  it('utilise flex-wrap sur la liste (pas overflow)', () => {
    render(<CentreServicesGrid services={['WiFi', 'Coworking']} />)
    const ul = screen.getByLabelText('Liste des services')
    expect(ul.className).toMatch(/flex/)
    expect(ul.className).toMatch(/flex-wrap/)
  })

  it('affiche un message si vide', () => {
    render(<CentreServicesGrid services={[]} />)
    expect(screen.getByText(/Aucun service renseigné/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Liste des services')).not.toBeInTheDocument()
  })
})
