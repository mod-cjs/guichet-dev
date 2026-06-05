import { render, screen, fireEvent } from '@testing-library/react'
import { FiltresPanel, type FiltresValue } from '@/components/opportunites/FiltresPanel'

const baseValue: FiltresValue = { sortBy: 'recent' }

function setup(overrides?: Partial<Parameters<typeof FiltresPanel>[0]>) {
  const onChange = jest.fn()
  const onReset = jest.fn()
  const onApply = jest.fn()
  render(
    <FiltresPanel
      value={baseValue}
      onChange={onChange}
      onReset={onReset}
      onApply={onApply}
      resultsCount={124}
      {...overrides}
    />,
  )
  return { onChange, onReset, onApply }
}

describe('<FiltresPanel /> (desktop refactor — GUIC-251)', () => {
  it('rend les sections Type, Domaine, Région, Rémunération, Deadline', () => {
    setup()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Domaine')).toBeInTheDocument()
    expect(screen.getByText('Région')).toBeInTheDocument()
    expect(screen.getByText('Rémunération')).toBeInTheDocument()
    expect(screen.getByText('Deadline')).toBeInTheDocument()
  })

  it('rend les checkboxes Type (Emploi, Stage, Bourse, …)', () => {
    setup()
    expect(screen.getByLabelText('Emploi')).toBeInTheDocument()
    expect(screen.getByLabelText('Stage')).toBeInTheDocument()
    expect(screen.getByLabelText('Bourse')).toBeInTheDocument()
  })

  it('cocher Emploi propage onChange avec type=Emploi', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Emploi'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Emploi', sortBy: 'recent' }),
    )
  })

  it('décocher (re-cliquer) retire le filtre', () => {
    const { onChange } = setup({ value: { sortBy: 'recent', type: 'Emploi' } })
    fireEvent.click(screen.getByLabelText('Emploi'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    )
  })

  it('affiche les compteurs si props.counts.type est fourni', () => {
    setup({ counts: { type: { Emploi: 186, Stage: 142 } } })
    expect(screen.getByText('186')).toBeInTheDocument()
    expect(screen.getByText('142')).toBeInTheDocument()
  })

  it('badge actif affiche le nombre de filtres sélectionnés', () => {
    setup({
      value: { sortBy: 'recent', type: 'Emploi', region: 'Dakar', deadline: '7' },
    })
    expect(screen.getByLabelText(/3 filtres actifs/i)).toBeInTheDocument()
  })

  it('"Tout effacer" est désactivé sans filtre actif et appelle onReset sinon', () => {
    const { onReset } = setup({ value: { sortBy: 'recent', type: 'Emploi' } })
    const btn = screen.getByRole('button', { name: /tout effacer/i })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(onReset).toHaveBeenCalled()
  })

  it('CTA "Appliquer N filtres · X résultats" appelé avec onApply', () => {
    const { onApply } = setup({
      value: { sortBy: 'recent', type: 'Emploi', region: 'Dakar' },
      resultsCount: 42,
    })
    const cta = screen.getByRole('button', { name: /appliquer 2 filtres · 42 résultats/i })
    expect(cta).toBeInTheDocument()
    fireEvent.click(cta)
    expect(onApply).toHaveBeenCalled()
  })

  it('cocher Rémunéré propage remuneration=yes', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Rémunéré'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ remuneration: 'yes' }),
    )
  })

  it('cocher "Moins de 7 jours" propage deadline=7', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Moins de 7 jours'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: '7' }),
    )
  })
})
