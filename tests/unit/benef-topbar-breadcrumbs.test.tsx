import { render, screen } from '@testing-library/react'
import { BenefTopBar } from '@/components/layout/BenefTopBar'

const mockPathname = jest.fn<string | null, []>(() => '/jeune/mes-favoris')

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
}))

describe('<BenefTopBar /> — breadcrumbs (GUIC-402)', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/jeune/mes-favoris')
  })

  it('affiche un fil d’Ariane pour /jeune/mes-favoris', () => {
    render(<BenefTopBar />)
    const nav = screen.getByLabelText(/fil d.ariane/i)
    expect(nav).toBeInTheDocument()
    // « Mon espace › Mes favoris »
    expect(nav).toHaveTextContent(/Mon espace/i)
    expect(nav).toHaveTextContent(/Mes favoris/i)
  })

  it('mappe /jeune/mes-candidatures en « Mon espace › Mes candidatures »', () => {
    mockPathname.mockReturnValue('/jeune/mes-candidatures')
    render(<BenefTopBar />)
    const nav = screen.getByLabelText(/fil d.ariane/i)
    expect(nav).toHaveTextContent(/Mon espace/i)
    expect(nav).toHaveTextContent(/Mes candidatures/i)
  })

  it('masque les breadcrumbs sous lg via la classe hidden lg:flex', () => {
    render(<BenefTopBar />)
    const nav = screen.getByLabelText(/fil d.ariane/i)
    expect(nav.className).toMatch(/hidden/)
    expect(nav.className).toMatch(/lg:flex/)
  })
})
