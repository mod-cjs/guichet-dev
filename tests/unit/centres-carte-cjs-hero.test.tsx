/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { CarteCjsHero } from '@/components/centres/CarteCjsHero'

describe('<CarteCjsHero />', () => {
  it('affiche le nom utilisateur fourni', () => {
    render(<CarteCjsHero userName="Awa Diop" />)
    expect(screen.getByText('Awa Diop')).toBeInTheDocument()
  })

  it('affiche un fallback "Invité·e" si userName est vide ou absent', () => {
    render(<CarteCjsHero />)
    expect(screen.getByText('Invité·e')).toBeInTheDocument()
  })

  it('expose le QR comme image accessible (placeholder)', () => {
    render(<CarteCjsHero userName="Test" />)
    expect(screen.getByLabelText(/QR de membre CJS/i)).toBeInTheDocument()
  })

  it('affiche le badge "Membre CJS"', () => {
    render(<CarteCjsHero userName="x" />)
    expect(screen.getByText('Membre CJS')).toBeInTheDocument()
  })

  it('mentionne le centre passé en prop', () => {
    render(<CarteCjsHero userName="x" centre="CJS Kolda" />)
    expect(screen.getByText('CJS Kolda')).toBeInTheDocument()
  })
})
