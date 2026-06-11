/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreRegionFilter } from '@/components/centres/CentreRegionFilter'

const REGIONS = ['Dakar', 'Thies', 'Tambacounda']

describe('<CentreRegionFilter />', () => {
  it('expose role="radiogroup"', () => {
    render(<CentreRegionFilter regions={REGIONS} value="all" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('rend un chip "Toutes" + un par région', () => {
    render(<CentreRegionFilter regions={REGIONS} value="all" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Toutes' })).toBeInTheDocument()
    REGIONS.forEach((r) => {
      expect(screen.getByRole('radio', { name: r })).toBeInTheDocument()
    })
  })

  it('marque le chip actif aria-checked="true"', () => {
    render(<CentreRegionFilter regions={REGIONS} value="Dakar" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Dakar' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'Toutes' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('appelle onChange avec la région cliquée', () => {
    const fn = jest.fn()
    render(<CentreRegionFilter regions={REGIONS} value="all" onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Thies' }))
    expect(fn).toHaveBeenCalledWith('Thies')
  })

  it('navigation clavier : ArrowRight déplace vers la chip suivante', () => {
    const fn = jest.fn()
    render(<CentreRegionFilter regions={REGIONS} value="all" onChange={fn} />)
    const all = screen.getByRole('radio', { name: 'Toutes' })
    fireEvent.keyDown(all, { key: 'ArrowRight' })
    expect(fn).toHaveBeenCalledWith('Dakar')
  })

  it('affiche les compteurs `(N)` si counts fourni (pas pour "Toutes")', () => {
    render(
      <CentreRegionFilter
        regions={REGIONS}
        value="all"
        onChange={() => {}}
        counts={{ Dakar: 3, Thies: 1, Tambacounda: 2 }}
      />,
    )
    // Le compteur est aria-hidden donc visible textuellement mais hors a11y tree
    expect(screen.getByRole('radio', { name: 'Dakar' })).toHaveTextContent('(3)')
    expect(screen.getByRole('radio', { name: 'Thies' })).toHaveTextContent('(1)')
    // "Toutes" n'a pas de compteur
    expect(screen.getByRole('radio', { name: 'Toutes' })).not.toHaveTextContent(/\(\d+\)/)
  })
})
