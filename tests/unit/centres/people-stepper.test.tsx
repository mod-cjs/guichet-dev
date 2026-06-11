/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { PeopleStepper } from '@/components/centres/PeopleStepper'

describe('<PeopleStepper />', () => {
  it('rend la valeur courante', () => {
    render(<PeopleStepper value={3} max={8} onChange={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('incrémente sur clic +', () => {
    const fn = jest.fn()
    render(<PeopleStepper value={3} max={8} onChange={fn} />)
    fireEvent.click(screen.getByLabelText('Augmenter le nombre'))
    expect(fn).toHaveBeenCalledWith(4)
  })

  it('décrémente sur clic –', () => {
    const fn = jest.fn()
    render(<PeopleStepper value={3} max={8} onChange={fn} />)
    fireEvent.click(screen.getByLabelText('Diminuer le nombre'))
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('désactive – au min', () => {
    render(<PeopleStepper value={1} min={1} max={8} onChange={() => {}} />)
    expect(screen.getByLabelText('Diminuer le nombre')).toBeDisabled()
  })

  it('désactive + au max + a aria-live sur la valeur', () => {
    const { container } = render(
      <PeopleStepper value={8} max={8} onChange={() => {}} />,
    )
    expect(screen.getByLabelText('Augmenter le nombre')).toBeDisabled()
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
  })
})
