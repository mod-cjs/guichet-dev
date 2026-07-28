/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartenaireCard, type PartenaireCardData } from './index'

const base: PartenaireCardData = {
  id: 'o1',
  nom: 'Wave Sénégal',
  secteur: 'Numerique',
  region: 'Dakar',
  estVerifie: true,
  opportunitesCount: 38,
}

describe('PartenaireCard', () => {
  it('affiche nom, secteur·région, badge vérifié et le nombre d’offres', () => {
    render(<PartenaireCard partenaire={base} />)
    expect(screen.getByText('Wave Sénégal')).toBeInTheDocument()
    expect(screen.getByText(/Numerique/)).toBeInTheDocument()
    expect(screen.getByText(/vérifié/i)).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
  })

  it('applique la couleur du secteur via la variable --sc', () => {
    const { container } = render(<PartenaireCard partenaire={base} />)
    const card = container.querySelector('button') as HTMLElement
    expect(card.style.getPropertyValue('--sc')).toContain('--gj-sector-numerique')
  })

  it('non vérifié : badge distinct', () => {
    render(<PartenaireCard partenaire={{ ...base, estVerifie: false }} />)
    expect(screen.getByText(/non vérifié/i)).toBeInTheDocument()
  })

  it('clic sur la carte → onOpen(id)', async () => {
    const onOpen = jest.fn()
    render(<PartenaireCard partenaire={base} onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith('o1')
  })
})
