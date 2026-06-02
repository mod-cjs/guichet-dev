import { render, screen } from '@testing-library/react'
import { CandidaturePipelineStepper } from '@/components/candidatures/CandidaturePipelineStepper'

describe('<CandidaturePipelineStepper />', () => {
  it('cas Brouillon : 1 courant, 4 todo', () => {
    render(<CandidaturePipelineStepper currentStep="Brouillon" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '1')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
    expect(screen.getByTestId('stepper-segment-Brouillon')).toHaveAttribute('data-state', 'current')
    expect(screen.getByTestId('stepper-segment-Envoyee')).toHaveAttribute('data-state', 'todo')
    expect(screen.getByTestId('stepper-segment-Decision')).toHaveAttribute('data-state', 'todo')
  })

  it('cas Envoyée : 1 done, 1 current, 3 todo', () => {
    render(<CandidaturePipelineStepper currentStep="Envoyee" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByTestId('stepper-segment-Brouillon')).toHaveAttribute('data-state', 'done')
    expect(screen.getByTestId('stepper-segment-Envoyee')).toHaveAttribute('data-state', 'current')
    expect(screen.getByTestId('stepper-segment-EnRevue')).toHaveAttribute('data-state', 'todo')
  })

  it('cas EnRevue : 2 done, 1 current', () => {
    render(<CandidaturePipelineStepper currentStep="EnRevue" />)
    expect(screen.getByTestId('stepper-segment-Envoyee')).toHaveAttribute('data-state', 'done')
    expect(screen.getByTestId('stepper-segment-EnRevue')).toHaveAttribute('data-state', 'current')
    expect(screen.getByTestId('stepper-segment-Entretien')).toHaveAttribute('data-state', 'todo')
  })

  it('cas Entretien : 3 done, 1 current', () => {
    render(<CandidaturePipelineStepper currentStep="Entretien" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4')
    expect(screen.getByTestId('stepper-segment-Entretien')).toHaveAttribute('data-state', 'current')
    expect(screen.getByTestId('stepper-segment-Decision')).toHaveAttribute('data-state', 'todo')
  })

  it('cas Décision sans verdict : 4 done, 1 current (yellow)', () => {
    render(<CandidaturePipelineStepper currentStep="Decision" decision={null} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5')
    const final = screen.getByTestId('stepper-segment-Decision')
    expect(final).toHaveAttribute('data-state', 'current')
    expect(final.className).toMatch(/bg-gj-yellow/)
  })

  it('cas Décision acceptée : tous done, segment final green', () => {
    render(<CandidaturePipelineStepper currentStep="Decision" decision="Acceptee" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '5')
    expect(bar).toHaveAttribute('aria-label', expect.stringMatching(/acceptée/i))
    PIPELINE_LABELS.forEach((step) => {
      expect(screen.getByTestId(`stepper-segment-${step}`)).toHaveAttribute('data-state', 'done')
    })
  })

  it('cas Décision refusée : tous done, label refusée', () => {
    render(<CandidaturePipelineStepper currentStep="Decision" decision="Refusee" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/refusée/i),
    )
  })

  it('hideLabels : pas de labels textuels', () => {
    render(<CandidaturePipelineStepper currentStep="Envoyee" hideLabels />)
    expect(screen.queryByText('Envoyée')).not.toBeInTheDocument()
  })
})

const PIPELINE_LABELS = ['Brouillon', 'Envoyee', 'EnRevue', 'Entretien', 'Decision'] as const
