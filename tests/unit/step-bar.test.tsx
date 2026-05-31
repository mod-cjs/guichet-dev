import { render, screen } from '@testing-library/react'
import { StepBar } from '@/components/ui/StepBar'

describe('<StepBar />', () => {
  it('rend un progressbar avec aria-value{now,min,max}', () => {
    render(<StepBar step={2} total={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
  })

  it('affiche label défaut "Étape X / Y"', () => {
    render(<StepBar step={2} total={5} />)
    expect(screen.getByText('Étape 2 / 5')).toBeInTheDocument()
  })

  it('affiche le pourcentage', () => {
    render(<StepBar step={2} total={5} />)
    expect(screen.getByText('40 %')).toBeInTheDocument()
  })

  it('accepte un label custom', () => {
    render(<StepBar step={1} total={3} label="Section 1 / 3" />)
    expect(screen.getByText('Section 1 / 3')).toBeInTheDocument()
  })

  it('clamp step à total quand step > total', () => {
    render(<StepBar step={99} total={5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5')
    expect(screen.getByText('100 %')).toBeInTheDocument()
  })

  it('clamp step à 0 quand step < 0', () => {
    render(<StepBar step={-3} total={5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
